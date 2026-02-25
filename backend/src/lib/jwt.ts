import jwt from "jsonwebtoken";
import logger from "./logger";

// --- Secret validation ---
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    logger.fatal("JWT_SECRET environment variable is required in production");
    process.exit(1);
  }
  logger.warn(
    "JWT_SECRET not set — using insecure default. DO NOT use this in production.",
  );
}

const SECRET = JWT_SECRET || "savekaro-dev-secret-INSECURE";
const REFRESH = REFRESH_SECRET || "savekaro-dev-refresh-INSECURE";

// --- Token lifetimes ---
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

// --- Payload types ---
export interface TokenPayload {
  userId: string;
  email: string;
  type?: "access" | "refresh";
}

// --- Access tokens (short-lived, sent in Authorization header) ---

export function generateAccessToken(payload: {
  userId: string;
  email: string;
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

// --- Legacy support (kept for backward compat during migration) ---

export function generateToken(payload: {
  userId: string;
  email: string;
}): string {
  return generateAccessToken(payload);
}

export function verifyToken(token: string): TokenPayload | null {
  return verifyAccessToken(token);
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}
