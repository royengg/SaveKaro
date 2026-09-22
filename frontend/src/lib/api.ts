import type { DealRegion } from "@/lib/regions";
import { getAnalyticsRequestHeaders } from "@/lib/analytics/posthog";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

/**
 * Production can use the same-origin `/api` nginx proxy by leaving
 * VITE_API_URL unset. Local development keeps the standalone API default.
 */
export const API_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, "")
  : import.meta.env.DEV
    ? "http://localhost:3001"
    : "";

/**
 * OAuth may intentionally live on a dedicated host even when normal API
 * traffic uses the same-origin proxy. This preserves the host-only OAuth
 * state cookies used by the backend callback.
 */
export const AUTH_URL = (
  import.meta.env.VITE_AUTH_URL?.trim() || configuredApiUrl || API_URL
).replace(/\/$/, "");

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  signal?: AbortSignal;
  auth?: boolean;
  analytics?: boolean;
  credentials?: RequestCredentials;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function shouldRetryApiQuery(failureCount: number, error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return false;
  if (error instanceof ApiError) {
    if (error.status === 408 || error.status === 429) return failureCount < 2;
    if (error.status >= 500) return failureCount < 2;
    return false;
  }
  return failureCount < 2;
}

export interface AuthSessionData<TUser = unknown> {
  accessToken: string;
  expiresIn: number;
  user?: TUser;
}

class ApiClient {
  private baseUrl: string;
  private authBaseUrl: string;
  private accessToken: string | null = null;
  private refreshPromise: Promise<AuthSessionData | null> | null = null;

  constructor(baseUrl: string, authBaseUrl: string) {
    this.baseUrl = baseUrl;
    this.authBaseUrl = authBaseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  async exchangeCode<TUser = unknown>(
    code: string,
  ): Promise<AuthSessionData<TUser>> {
    const response = await fetch(`${this.authBaseUrl}/api/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAnalyticsRequestHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Token exchange failed" }));
      throw new ApiError(
        error.error || "Token exchange failed",
        response.status,
        error,
      );
    }

    const result = await response.json();
    if (result.success && result.data) {
      this.accessToken = result.data.accessToken;
      return result.data;
    }
    throw new Error("Token exchange failed");
  }

  async refreshAccessToken(): Promise<AuthSessionData | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.authBaseUrl}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getAnalyticsRequestHeaders(),
          },
        });

        if (!response.ok) {
          this.accessToken = null;
          return null;
        }

        const result = await response.json();
        if (result.success && result.data?.accessToken) {
          this.accessToken = result.data.accessToken;
          return result.data;
        }
        this.accessToken = null;
        return null;
      } catch {
        this.accessToken = null;
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const {
      method = "GET",
      body,
      headers = {},
      cache,
      signal,
      auth = true,
      analytics = true,
      credentials = "include",
    } = options;

    const baseHeaders: Record<string, string> = {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(analytics ? getAnalyticsRequestHeaders() : {}),
      ...headers,
    };

    const makeRequest = async (token?: string | null) => {
      const requestHeaders = { ...baseHeaders };
      const authToken = token ?? this.accessToken;

      if (auth && authToken) {
        requestHeaders["Authorization"] = `Bearer ${authToken}`;
      }

      return fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        credentials,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache,
        signal,
      });
    };

    let response = await makeRequest();

    if (auth && response.status === 401) {
      const newSession = await this.refreshAccessToken();
      if (newSession) {
        response = await makeRequest(newSession.accessToken);
      }
    }

    if (!response.ok) {
      const errorPayload = await response
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new ApiError(
        errorPayload.error || `Request failed with status ${response.status}`,
        response.status,
        errorPayload,
      );
    }

    return response.json();
  }

  async logout() {
    try {
      await fetch(`${this.authBaseUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAnalyticsRequestHeaders(),
        },
      });
    } finally {
      this.accessToken = null;
    }
  }

  async getDeals(params?: {
    page?: number;
    limit?: number;
    category?: string;
    store?: string;
    minDiscount?: number;
    search?: string;
    sortBy?: "newest" | "popular" | "discount";
    region?: DealRegion;
    source?: "REDDIT" | "USER_SUBMITTED";
    status?: "ACTIVE" | "EXPIRED" | "REJECTED";
    showInactive?: boolean;
  }, signal?: AbortSignal) {
    const requiresAuthentication = Boolean(
      params?.showInactive || params?.status,
    );
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/deals${query ? `?${query}` : ""}`, {
      signal,
      auth: requiresAuthentication,
      analytics: false,
      credentials: requiresAuthentication ? "include" : "omit",
    });
  }

  async getHomeBootstrap(params?: {
    limit?: number;
    category?: string;
    store?: string;
    minDiscount?: number;
    search?: string;
    sortBy?: "newest" | "popular" | "discount";
    region?: DealRegion;
  }, signal?: AbortSignal) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/deals/home${query ? `?${query}` : ""}`, {
      signal,
      auth: false,
      analytics: false,
      credentials: "omit",
    });
  }

  async getDeal(id: string, signal?: AbortSignal) {
    return this.request(`/api/deals/${id}`, {
      signal,
      analytics: false,
      credentials: "omit",
    });
  }

  async getDealPriceHistory(id: string, page = 1, limit = 30, signal?: AbortSignal) {
    return this.request(
      `/api/deals/${id}/price-history?page=${page}&limit=${limit}`,
      {
        signal,
        auth: false,
        analytics: false,
        credentials: "omit",
      },
    );
  }

  async createDeal(data: {
    title: string;
    description?: string;
    originalPrice?: number;
    dealPrice?: number;
    discountPercent?: number;
    productUrl: string;
    imageUrl?: string;
    store?: string;
    categoryId: string;
    region: DealRegion;
  }) {
    return this.request("/api/deals", { method: "POST", body: data });
  }

  async deleteDeal(id: string) {
    return this.request(`/api/deals/${id}`, { method: "DELETE" });
  }

  async voteDeal(id: string, value: 1 | -1 | 0) {
    return this.request(`/api/deals/${id}/vote`, {
      method: "POST",
      body: { value },
    });
  }

  async saveDeal(id: string) {
    return this.request(`/api/deals/${id}/save`, { method: "POST" });
  }

  async trackClick(id: string) {
    return this.request(`/api/deals/${id}/click`, { method: "POST" });
  }

  async getCategories(signal?: AbortSignal) {
    return this.request("/api/categories", {
      signal,
      auth: false,
      analytics: false,
      credentials: "omit",
    });
  }

  async getCurrentUser() {
    return this.request("/api/auth/me");
  }

  async getSavedDeals(page = 1, limit = 20, signal?: AbortSignal) {
    return this.request(`/api/users/me/saved?page=${page}&limit=${limit}`, {
      signal,
    });
  }

  async getHomeUserSummary(signal?: AbortSignal) {
    return this.request("/api/users/me/home-summary", { signal });
  }

  async getUnreadNotificationCount(signal?: AbortSignal) {
    return this.request("/api/users/me/unread-notification-count", { signal });
  }

  async getSavedSignals(signal?: AbortSignal) {
    return this.request("/api/users/me/saved-signals", { signal });
  }

  async getSubmittedDeals(page = 1, limit = 20, signal?: AbortSignal) {
    return this.request(`/api/users/me/submitted?page=${page}&limit=${limit}`, {
      signal,
    });
  }

  async getUserStats(signal?: AbortSignal) {
    return this.request("/api/users/me/stats", { signal });
  }

  async getPreferences(signal?: AbortSignal) {
    return this.request("/api/users/me/preferences", { signal });
  }

  async updatePreferences(data: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    preferredCategories?: string[];
    minDiscountPercent?: number;
  }) {
    return this.request("/api/users/me/preferences", {
      method: "PUT",
      body: data,
    });
  }

  async getComments(dealId: string, page = 1, limit = 20, signal?: AbortSignal) {
    return this.request(
      `/api/comments/deal/${dealId}?page=${page}&limit=${limit}`,
      {
        signal,
        auth: false,
        analytics: false,
        credentials: "omit",
      },
    );
  }

  async getCommentReplies(
    parentId: string,
    page = 1,
    limit = 20,
    signal?: AbortSignal,
  ) {
    return this.request(
      `/api/comments/${parentId}/replies?page=${page}&limit=${limit}`,
      {
        signal,
        auth: false,
        analytics: false,
        credentials: "omit",
      },
    );
  }

  async createComment(dealId: string, content: string, parentId?: string) {
    return this.request(`/api/comments/deal/${dealId}`, {
      method: "POST",
      body: { content, parentId },
    });
  }

  async getNotifications(page = 1, limit = 20, unreadOnly = false, signal?: AbortSignal) {
    return this.request(
      `/api/notifications?page=${page}&limit=${limit}${unreadOnly ? "&unread=true" : ""}`,
      { signal },
    );
  }

  async markNotificationRead(id: string) {
    return this.request(`/api/notifications/${id}/read`, { method: "PUT" });
  }

  async markAllNotificationsRead() {
    return this.request("/api/notifications/read-all", { method: "PUT" });
  }

  async getStats(signal?: AbortSignal) {
    return this.request("/api/stats", {
      signal,
      auth: false,
      analytics: false,
      credentials: "omit",
    });
  }

  async getLeaderboard(limit = 100, signal?: AbortSignal) {
    return this.request(`/api/gamification/leaderboard?limit=${limit}`, {
      signal,
      auth: false,
      analytics: false,
      credentials: "omit",
    });
  }

  async getBadges(signal?: AbortSignal) {
    return this.request("/api/gamification/badges", {
      signal,
      auth: false,
      analytics: false,
      credentials: "omit",
    });
  }

  async getUserBadges(userId: string, signal?: AbortSignal) {
    return this.request(`/api/gamification/users/${userId}/badges`, {
      signal,
      auth: false,
      analytics: false,
      credentials: "omit",
    });
  }

  async getChallenges(signal?: AbortSignal) {
    return this.request("/api/gamification/challenges", {
      signal,
      auth: false,
      analytics: false,
      credentials: "omit",
    });
  }

  async createChallenge(data: {
    title: string;
    description: string;
    criteria: Record<string, unknown>;
    startDate: string;
    endDate: string;
  }) {
    return this.request("/api/gamification/challenges", {
      method: "POST",
      body: data,
    });
  }

  async getAlerts(signal?: AbortSignal) {
    return this.request("/api/alerts", { signal });
  }

  async createAlert(data: {
    mode?: "KEYWORD" | "URL";
    keywords?: string;
    watchUrl?: string;
    maxPrice?: number;
    categoryId?: string;
    region?: DealRegion;
  }) {
    return this.request("/api/alerts", { method: "POST", body: data });
  }

  async updateAlert(
    id: string,
    data: {
      mode?: "KEYWORD" | "URL";
      keywords?: string;
      watchUrl?: string | null;
      maxPrice?: number;
      categoryId?: string | null;
      region?: DealRegion | null;
    },
  ) {
    return this.request(`/api/alerts/${id}`, { method: "PUT", body: data });
  }

  async deleteAlert(id: string) {
    return this.request(`/api/alerts/${id}`, { method: "DELETE" });
  }

  async toggleAlert(id: string) {
    return this.request(`/api/alerts/${id}/toggle`, { method: "PUT" });
  }
}

export const api = new ApiClient(API_URL, AUTH_URL);
export default api;
