import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { generateAccessToken } from "../lib/jwt";
import { TOKEN_LIFETIMES } from "../config/constants";

export const mobileUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  isAdmin: true,
  createdAt: true,
  preferences: true,
  _count: {
    select: { savedDeals: true, submittedDeals: true, comments: true },
  },
} satisfies Prisma.UserSelect;

export class MobileAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 401 | 409 | 503 = 401,
  ) {
    super(message);
  }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type SessionUser = Prisma.UserGetPayload<{ select: typeof mobileUserSelect }>;

function sessionResponse(user: SessionUser, refreshToken: string) {
  return {
    accessToken: generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
    }),
    refreshToken,
    expiresIn: TOKEN_LIFETIMES.ACCESS_TOKEN_SECONDS,
    user,
  };
}

export async function createMobileSession(user: SessionUser) {
  const refreshToken = randomBytes(32).toString("base64url");
  await prisma.mobileSession.create({
    data: {
      userId: user.id,
      familyId: randomUUID(),
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return sessionResponse(user, refreshToken);
}

export async function refreshMobileSession(token: string) {
  const refreshToken = randomBytes(32).toString("base64url");
  // Serialize the whole family, including parent-token reuse during child refresh.
  const result = await prisma.$transaction(async (tx) => {
    const hash = hashRefreshToken(token);
    const lookup = await tx.mobileSession.findUnique({
      where: { refreshTokenHash: hash },
      select: { familyId: true },
    });
    if (!lookup) return null;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lookup.familyId}, 0))`;
    const session = await tx.mobileSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: { select: mobileUserSelect } },
    });
    const now = new Date();
    if (!session || session.expiresAt <= now || session.revokedAt) return null;
    if (session.consumedAt) {
      await tx.mobileSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      return null; // Commit revocation before reporting the invalid token.
    }
    await tx.mobileSession.update({
      where: { id: session.id },
      data: { consumedAt: now },
    });
    await tx.mobileSession.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: session.expiresAt,
      },
    });
    return session.user;
  });
  if (!result)
    throw new MobileAuthError("SESSION_EXPIRED", "Please sign in again");
  return sessionResponse(result, refreshToken);
}

export async function revokeMobileSession(token: string) {
  const hash = hashRefreshToken(token);
  await prisma.$transaction(async (tx) => {
    const session = await tx.mobileSession.findUnique({
      where: { refreshTokenHash: hash },
    });
    if (session) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${session.familyId}, 0))`;
      await tx.mobileSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  });
}
