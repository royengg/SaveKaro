const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  // Exchange one-time auth code for access token (+ refresh token set as cookie)
  async exchangeCode(
    code: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch(`${this.baseUrl}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important: sends/receives cookies
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Token exchange failed" }));
      throw new Error(error.error || "Token exchange failed");
    }

    const result = await response.json();
    if (result.success && result.data) {
      this.accessToken = result.data.accessToken;
      return result.data;
    }
    throw new Error("Token exchange failed");
  }

  // Refresh the access token using the httpOnly refresh token cookie
  async refreshAccessToken(): Promise<string | null> {
    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          this.accessToken = null;
          return null;
        }

        const result = await response.json();
        if (result.success && result.data?.accessToken) {
          this.accessToken = result.data.accessToken;
          return result.data.accessToken;
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
    const { method = "GET", body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (this.accessToken) {
      requestHeaders["Authorization"] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      credentials: "include", // Always include cookies for refresh token
      body: body ? JSON.stringify(body) : undefined,
    });

    // If 401, try to refresh the access token and retry once
    if (response.status === 401 && this.accessToken) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        requestHeaders["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: requestHeaders,
          credentials: "include",
          body: body ? JSON.stringify(body) : undefined,
        });
      }
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new Error(
        error.error || `Request failed with status ${response.status}`,
      );
    }

    return response.json();
  }

  // Auth
  async logout() {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      this.accessToken = null;
    }
  }

  // Deals
  async getDeals(params?: {
    page?: number;
    limit?: number;
    category?: string;
    store?: string;
    minDiscount?: number;
    search?: string;
    sortBy?: "newest" | "popular" | "discount";
    region?: "INDIA" | "WORLD";
    source?: "REDDIT" | "USER_SUBMITTED";
    status?: "ACTIVE" | "EXPIRED" | "REJECTED";
    showInactive?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/deals${query ? `?${query}` : ""}`);
  }

  async getDeal(id: string) {
    return this.request(`/api/deals/${id}`);
  }

  async getDealPriceHistory(id: string, page = 1, limit = 30) {
    return this.request(
      `/api/deals/${id}/price-history?page=${page}&limit=${limit}`,
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
    region: "INDIA" | "WORLD";
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

  // Categories
  async getCategories() {
    return this.request("/api/categories");
  }

  // User
  async getCurrentUser() {
    return this.request("/api/auth/me");
  }

  async getSavedDeals(page = 1, limit = 20) {
    return this.request(`/api/users/me/saved?page=${page}&limit=${limit}`);
  }

  async getSubmittedDeals(page = 1, limit = 20) {
    return this.request(`/api/users/me/submitted?page=${page}&limit=${limit}`);
  }

  async getUserStats() {
    return this.request("/api/users/me/stats");
  }

  async getPreferences() {
    return this.request("/api/users/me/preferences");
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

  // Comments
  async getComments(dealId: string, page = 1, limit = 20) {
    return this.request(
      `/api/comments/deal/${dealId}?page=${page}&limit=${limit}`,
    );
  }

  async createComment(dealId: string, content: string, parentId?: string) {
    return this.request(`/api/comments/deal/${dealId}`, {
      method: "POST",
      body: { content, parentId },
    });
  }

  // Notifications
  async getNotifications(page = 1, limit = 20, unreadOnly = false) {
    return this.request(
      `/api/notifications?page=${page}&limit=${limit}${unreadOnly ? "&unread=true" : ""}`,
    );
  }

  async markNotificationRead(id: string) {
    return this.request(`/api/notifications/${id}/read`, { method: "PUT" });
  }

  async markAllNotificationsRead() {
    return this.request("/api/notifications/read-all", { method: "PUT" });
  }

  // Stats
  async getStats() {
    return this.request("/api/stats");
  }

  // Gamification
  async getLeaderboard(limit = 100) {
    return this.request(`/api/gamification/leaderboard?limit=${limit}`);
  }

  async getBadges() {
    return this.request("/api/gamification/badges");
  }

  async getUserBadges(userId: string) {
    return this.request(`/api/gamification/users/${userId}/badges`);
  }

  async getChallenges() {
    return this.request("/api/gamification/challenges");
  }

  async createChallenge(data: {
    title: string;
    description: string;
    criteria: Record<string, any>;
    startDate: string;
    endDate: string;
  }) {
    return this.request("/api/gamification/challenges", {
      method: "POST",
      body: data,
    });
  }

  // Price Alerts
  async getAlerts() {
    return this.request("/api/alerts");
  }

  async createAlert(data: {
    mode?: "KEYWORD" | "URL";
    keywords?: string;
    watchUrl?: string;
    maxPrice?: number;
    categoryId?: string;
    region?: "INDIA" | "WORLD";
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
      region?: "INDIA" | "WORLD" | null;
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

export const api = new ApiClient(API_URL);
export default api;
