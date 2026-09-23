export type DealRegion = "INDIA" | "CANADA" | "WORLD";
export type DealSource = "REDDIT" | "USER_SUBMITTED";

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  dealCount: number;
}

export type DealCategory = Omit<Category, "dealCount"> & {
  dealCount?: number;
};

export interface PublicUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  preferredCategories: string[];
  minDiscountPercent: number;
}

export interface User extends PublicUser {
  email: string;
  isAdmin?: boolean;
  preferences?: UserPreferences | null;
  _count?: {
    savedDeals: number;
    submittedDeals: number;
    comments: number;
  };
}

export interface MobileSession {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: User;
}

export interface PriceHistoryPoint {
  id: string;
  price: string;
  source?: string | null;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  cleanTitle?: string | null;
  brand?: string | null;
  description: string | null;
  originalPrice: string | null;
  dealPrice: string | null;
  discountPercent: number | null;
  productUrl: string;
  affiliateUrl?: string | null;
  imageUrl: string | null;
  store: string | null;
  currency: string;
  region: DealRegion;
  source: DealSource;
  redditScore: number;
  clickCount: number;
  upvoteCount: number;
  downvoteCount?: number;
  commentCount?: number;
  createdAt: string;
  category: DealCategory;
  submittedBy?: PublicUser | null;
  _count?: { comments: number };
  userUpvote?: number | null;
  userSaved?: boolean;
  priceHistory?: PriceHistoryPoint[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user: PublicUser;
  parentId?: string | null;
  replies?: Comment[];
  repliesPagination?: { limit: number; hasMore: boolean };
}

export type PriceAlertMode = "KEYWORD" | "URL";

export interface PriceAlert {
  id: string;
  mode: PriceAlertMode;
  keywords: string;
  watchUrl: string | null;
  maxPrice: string | number | null;
  categoryId: string | null;
  region: DealRegion | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type NotificationType =
  | "NEW_DEAL"
  | "PRICE_DROP"
  | "PRICE_ALERT"
  | "COMMENT_REPLY"
  | "DEAL_UPVOTED"
  | "SYSTEM";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}
