/**
 * Pagination utilities for consistent handling across all endpoints
 */

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Parse and validate pagination parameters from query string
 * Maintains exact same logic as existing code to ensure compatibility
 */
export function parsePaginationParams(
  pageParam?: string,
  limitParam?: string,
  defaultLimit: number = 20,
  maxLimit: number = 100
): PaginationParams {
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(limitParam || defaultLimit.toString(), 10) || defaultLimit)
  );
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Create standardized pagination response object
 */
export function createPaginationResponse(
  total: number,
  page: number,
  limit: number
): PaginationResponse {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Helper for Hono context query parsing - maintains existing behavior
 */
export function parsePaginationFromContext(c: any, defaultLimit: number = 20): PaginationParams {
  return parsePaginationParams(
    c.req.query("page"),
    c.req.query("limit"),
    defaultLimit,
    100
  );
}