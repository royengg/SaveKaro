import { createApiClient } from "@savekaro/api-client";

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let refresh: () => Promise<string | null> = async () => null;
export function setAccessToken(token: string | null, expiresIn = 0) {
  accessToken = token;
  accessTokenExpiresAt = Date.now() + expiresIn * 1000;
}
export function setRefreshHandler(handler: () => Promise<string | null>) {
  refresh = handler;
}
export const api = createApiClient({
  baseUrl: `${(process.env.EXPO_PUBLIC_API_URL || "https://api.savekaro.online").replace(/\/$/, "")}/api/v1`,
  getAccessToken: () =>
    accessToken && Date.now() < accessTokenExpiresAt - 30_000
      ? accessToken
      : refresh(),
  refreshAccessToken: () => refresh(),
});
