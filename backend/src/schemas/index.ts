import { z } from "zod";

// Deal Schemas
export const createDealSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(2000).optional(),
  originalPrice: z.number().positive().optional(),
  dealPrice: z.number().positive().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  productUrl: z.string().url(),
  imageUrl: z.string().url().optional(),
  store: z.string().max(100).optional(),
  categoryId: z.string().cuid(),
});

export const updateDealSchema = createDealSchema.partial();

export const dealQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional(),
  store: z.string().optional(),
  minDiscount: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["newest", "popular", "discount"]).default("newest"),
  region: z.enum(["INDIA", "WORLD"]).optional(),
});

// User Schemas

export const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  preferredCategories: z.array(z.string().cuid()).optional(),
  minDiscountPercent: z.number().int().min(0).max(100).optional(),
});

// Comment Schemas

export const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().cuid().optional(),
});

// Badge Schemas (admin only)

export const createBadgeSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  icon: z.string().min(1).max(10),
  description: z.string().min(5).max(500),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]),
  criteria: z.object({
    type: z.string(),
    threshold: z.number().int().min(0),
  }),
});

// Challenge Schemas (admin only)

export const createChallengeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(1000),
  criteria: z.object({
    category: z.string().optional(),
    maxPrice: z.number().positive().optional(),
    minDiscount: z.number().int().min(0).max(100).optional(),
  }),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Price Alert Schemas

export const createAlertSchema = z.object({
  keywords: z.string().min(2).max(200),
  maxPrice: z.number().positive().optional(),
  categoryId: z.string().cuid().optional(),
  region: z.enum(["INDIA", "WORLD"]).optional(),
});

export const updateAlertSchema = createAlertSchema.partial();

// Common Response Types

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type exports
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type DealQueryInput = z.infer<typeof dealQuerySchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateBadgeInput = z.infer<typeof createBadgeSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
