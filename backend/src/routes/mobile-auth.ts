import { Hono } from "hono";
import { z } from "zod";
import { authRateLimiter } from "../middleware/rate-limiter";
import { requireAuth } from "../middleware/auth";
import prisma from "../lib/prisma";
import {
  createMobileSession,
  refreshMobileSession,
  revokeMobileSession,
  MobileAuthError,
  mobileUserSelect,
} from "../services/mobile-session";
import {
  findOrCreateMobileUser,
  verifyMobileIdentity,
} from "../services/mobile-identity";
import { ensureWelcomeNotification } from "../services/notification/welcome";

const mobileAuth = new Hono();
const credentialSchema = z.object({
  idToken: z.string().min(1).max(16384),
  nonce: z.string().min(16).max(256).optional(),
});
const refreshSchema = z.object({
  refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

mobileAuth.use("*", authRateLimiter, async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
mobileAuth.onError((error, c) => {
  if (error instanceof MobileAuthError)
    return c.json(
      { success: false, error: error.message, code: error.code },
      error.status,
    );
  throw error;
});

for (const provider of ["google", "apple"] as const) {
  mobileAuth.post(`/${provider}`, async (c) => {
    const parsed = credentialSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success)
      return c.json(
        {
          success: false,
          error: "Invalid sign-in request",
          code: "VALIDATION_FAILED",
        },
        400,
      );
    const identity = await verifyMobileIdentity(
      provider === "google" ? "GOOGLE" : "APPLE",
      parsed.data.idToken,
      parsed.data.nonce,
    );
    const user = await findOrCreateMobileUser(identity);
    await ensureWelcomeNotification(prisma, user);
    return c.json({ success: true, data: await createMobileSession(user) });
  });
}

mobileAuth.post("/refresh", async (c) => {
  const parsed = refreshSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json(
      {
        success: false,
        error: "Invalid refresh token",
        code: "VALIDATION_FAILED",
      },
      400,
    );
  return c.json({
    success: true,
    data: await refreshMobileSession(parsed.data.refreshToken),
  });
});

mobileAuth.post("/logout", async (c) => {
  const parsed = refreshSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json(
      {
        success: false,
        error: "Invalid refresh token",
        code: "VALIDATION_FAILED",
      },
      400,
    );
  await revokeMobileSession(parsed.data.refreshToken);
  return c.json({ success: true, data: { loggedOut: true } });
});

mobileAuth.get("/me", requireAuth, async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.get("user")!.id },
    select: mobileUserSelect,
  });
  if (!user)
    throw new MobileAuthError("SESSION_EXPIRED", "Please sign in again");
  return c.json({ success: true, data: user });
});

export default mobileAuth;
