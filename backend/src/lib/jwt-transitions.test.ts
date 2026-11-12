import { afterEach, expect, spyOn, test } from "bun:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "jwt-transition-test-only";
process.env.REFRESH_SECRET = "jwt-transition-test-refresh-only";
const { generateRefreshToken, verifyRefreshToken, generateAccessToken } =
  await import("./jwt");
const now = Date.now;
afterEach(() => {
  Date.now = now;
});
const user = { userId: "user", email: "user@example.test" };

test("refreshes issued in one second are unique and retain the configured expiry", () => {
  spyOn(Date, "now").mockReturnValue(1_794_486_000_000);
  const tokens = Array.from({ length: 20 }, () => generateRefreshToken(user));
  expect(new Set(tokens).size).toBe(20);
  for (const token of tokens) {
    const payload = jwt.decode(token) as jwt.JwtPayload;
    expect(payload.jti).toBeString();
    expect(payload.exp! - payload.iat!).toBe(7 * 24 * 60 * 60);
    expect(verifyRefreshToken(token)).toMatchObject({
      ...user,
      type: "refresh",
    });
  }
});

test("existing refresh JWTs without jti remain valid", () => {
  const legacy = jwt.sign(
    { ...user, type: "refresh" },
    process.env.REFRESH_SECRET!,
    { expiresIn: "7d" },
  );
  expect(verifyRefreshToken(legacy)).toMatchObject(user);
});

test("access, expired, and tampered tokens are not accepted as refresh tokens", () => {
  expect(verifyRefreshToken(generateAccessToken(user))).toBeNull();
  const expired = jwt.sign(
    { ...user, type: "refresh" },
    process.env.REFRESH_SECRET!,
    { expiresIn: -1 },
  );
  expect(verifyRefreshToken(expired)).toBeNull();
  const invalid = jwt.sign({ ...user, type: "refresh" }, "wrong-test-key", {
    expiresIn: "7d",
  });
  expect(verifyRefreshToken(invalid)).toBeNull();
});
