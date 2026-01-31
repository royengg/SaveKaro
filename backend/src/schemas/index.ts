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
