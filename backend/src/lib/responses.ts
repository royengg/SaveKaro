export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  unreadCount?: number; // For notifications endpoint compatibility
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function paginatedSuccessResponse<T>(
  data: T[],
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  },
  unreadCount?: number,
): PaginatedApiResponse<T> {
  const response: PaginatedApiResponse<T> = {
    success: true,
    data,
    pagination,
  };

  if (unreadCount !== undefined) {
    response.unreadCount = unreadCount;
  }

  return response;
}

export function errorResponse(error: string, details?: any): ApiResponse {
  const response: ApiResponse = { success: false, error };
  if (details) {
    response.details = details;
  }
  return response;
}

export function notFoundResponse(resource: string): ApiResponse {
  return errorResponse(`${resource} not found`);
}

export function unauthorizedResponse(
  message: string = "Not authorized",
): ApiResponse {
  return errorResponse(message);
}

export function authRequiredResponse(): ApiResponse {
  return errorResponse("Authentication required");
}

export function validationErrorResponse(
  message: string,
  details?: any,
): ApiResponse {
  return errorResponse(message, details);
}
