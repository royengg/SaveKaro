import jwt from "jsonwebtoken";
import logger from "./logger";
import { TOKEN_LIFETIMES } from "../config/constants";

// --- Secret validation ---
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!JWT_SECRET) {
    logger.fatal("JWT_SECRET environment variable is required in production");
    process.exit(1);
  }
  if (!REFRESH_SECRET) {
    logger.fatal(
      "REFRESH_SECRET environment variable is required in production (must differ from JWT_SECRET)",
    );
    process.exit(1);
  }
} else {
  if (!JWT_SECRET) {
    logger.warn(
      "JWT_SECRET not set — using insecure default. DO NOT use this in production.",
    );
  }
  if (!REFRESH_SECRET) {
    logger.warn(
      "REFRESH_SECRET not set — using insecure default. DO NOT use this in production.",
    );
  }
}

const SECRET = JWT_SECRET || "savekaro-dev-secret-INSECURE";
const REFRESH = REFRESH_SECRET || "savekaro-dev-refresh-INSECURE";

// --- Token lifetimes ---
const ACCESS_TOKEN_EXPIRES_IN = TOKEN_LIFETIMES.ACCESS_TOKEN;
const REFRESH_TOKEN_EXPIRES_IN = TOKEN_LIFETIMES.REFRESH_TOKEN;

// --- Payload types ---
export interface TokenPayload {
  userId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  type?: "access" | "refresh";
}

// --- Access tokens (short-lived, sent in Authorization header) ---

export function generateAccessToken(payload: {
  userId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}): string {
  return jwt.sign({ ...payload, type: "access" }, SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as TokenPayload;
    if (decoded.type && decoded.type !== "access") return null;
    return decoded;
  } catch {
    return null;
  }
}

// --- Refresh tokens (long-lived, sent in httpOnly cookie) ---

export function generateRefreshToken(payload: {
  userId: string;
  email: string;
}): string {
  return jwt.sign({ ...payload, type: "refresh" }, REFRESH, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH) as TokenPayload;
    if (decoded.type && decoded.type !== "refresh") return null;
    return decoded;
  } catch {
    return null;
  }
}
