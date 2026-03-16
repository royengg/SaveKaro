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

export function parsePaginationParams(
  pageParam?: string,
  limitParam?: string,
  defaultLimit: number = 20,
  maxLimit: number = 100,
): PaginationParams {
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(
      1,
      parseInt(limitParam || defaultLimit.toString(), 10) || defaultLimit,
    ),
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPaginationResponse(
  total: number,
  page: number,
  limit: number,
): PaginationResponse {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function parsePaginationFromContext(
  c: any,
  defaultLimit: number = 20,
): PaginationParams {
  return parsePaginationParams(
    c.req.query("page"),
    c.req.query("limit"),
    defaultLimit,
    100,
  );
}
