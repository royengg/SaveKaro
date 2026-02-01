const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("auth_token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  getToken() {
    return this.token;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (this.token) {
      requestHeaders["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

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
  }) {
    return this.request("/api/deals", { method: "POST", body: data });
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
}

export const api = new ApiClient(API_URL);
export default api;
