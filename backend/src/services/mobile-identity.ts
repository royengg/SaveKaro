import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash } from "node:crypto";
import type { AuthProvider } from "@prisma/client";
import prisma from "../lib/prisma";
import { MobileAuthError, mobileUserSelect } from "./mobile-session";

const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const appleKeys = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

export async function verifyMobileIdentity(
  provider: AuthProvider,
  idToken: string,
  nonce?: string,
) {
  const audiences = (
    provider === "GOOGLE"
      ? process.env.GOOGLE_MOBILE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID
      : process.env.APPLE_CLIENT_IDS
  )
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!audiences?.length)
    throw new MobileAuthError(
      "PROVIDER_UNAVAILABLE",
      "This sign-in provider is not configured",
      503,
    );
  if (provider === "APPLE" && !nonce)
    throw new MobileAuthError(
      "INVALID_CREDENTIAL",
      "A sign-in nonce is required",
    );
  try {
    const { payload } = await jwtVerify(
      idToken,
      provider === "GOOGLE" ? googleKeys : appleKeys,
      {
        issuer:
          provider === "GOOGLE"
            ? ["https://accounts.google.com", "accounts.google.com"]
            : "https://appleid.apple.com",
        audience: audiences,
        algorithms: ["RS256"],
        requiredClaims: ["sub", "iat", "exp"],
        maxTokenAge: "10m",
        clockTolerance: 5,
      },
    );
    const expectedNonce =
      nonce && provider === "APPLE"
        ? createHash("sha256").update(nonce).digest("hex")
        : nonce;
    if (!payload.sub || (expectedNonce && payload.nonce !== expectedNonce))
      throw new Error("Invalid nonce");
    if (
      payload.azp &&
      (typeof payload.azp !== "string" || !audiences.includes(payload.azp))
    )
      throw new Error("Invalid authorized party");
    const email =
      typeof payload.email === "string" &&
      (payload.email_verified === true || payload.email_verified === "true")
        ? payload.email
        : null;
    return {
      provider,
      subject: payload.sub,
      email,
      name:
        typeof payload.name === "string" ? payload.name.slice(0, 200) : null,
      avatarUrl:
        typeof payload.picture === "string" &&
        payload.picture.startsWith("https://")
          ? payload.picture
          : null,
    };
  } catch {
    throw new MobileAuthError(
      "INVALID_CREDENTIAL",
      "Sign-in expired or could not be verified. Please try again",
    );
  }
}

export async function findOrCreateMobileUser(
  identity: Awaited<ReturnType<typeof verifyMobileIdentity>>,
) {
  const existing = await prisma.authIdentity.findUnique({
    where: {
      provider_subject: {
        provider: identity.provider,
        subject: identity.subject,
      },
    },
    include: { user: { select: mobileUserSelect } },
  });
  if (existing) return existing.user;

  // Web-created Google accounts remain identifiable by provider subject after migration.
  if (identity.provider === "GOOGLE") {
    const googleUser = await prisma.user.findUnique({
      where: { googleId: identity.subject },
      select: mobileUserSelect,
    });
    if (googleUser) {
      await prisma.authIdentity.upsert({
        where: {
          provider_subject: {
            provider: identity.provider,
            subject: identity.subject,
          },
        },
        create: {
          provider: identity.provider,
          subject: identity.subject,
          userId: googleUser.id,
        },
        update: {},
      });
      return googleUser;
    }
  }
  if (!identity.email)
    throw new MobileAuthError(
      "EMAIL_REQUIRED",
      "A verified email address is required to create your account",
    );
  if (
    await prisma.user.findUnique({
      where: { email: identity.email },
      select: { id: true },
    })
  ) {
    throw new MobileAuthError(
      "ACCOUNT_EXISTS",
      "This email already has an account. Sign in using the original provider",
      409,
    );
  }
  try {
    return await prisma.user.create({
      data: {
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl,
        googleId: identity.provider === "GOOGLE" ? identity.subject : null,
        identities: {
          create: { provider: identity.provider, subject: identity.subject },
        },
        preferences: { create: {} },
      },
      select: mobileUserSelect,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const raced = await prisma.authIdentity.findUnique({
        where: {
          provider_subject: {
            provider: identity.provider,
            subject: identity.subject,
          },
        },
        include: { user: { select: mobileUserSelect } },
      });
      if (raced) return raced.user;
      throw new MobileAuthError(
        "ACCOUNT_EXISTS",
        "This email already has an account. Sign in using the original provider",
        409,
      );
    }
    throw error;
  }
}
