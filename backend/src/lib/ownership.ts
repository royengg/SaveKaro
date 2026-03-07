/**
 * Ownership validation utilities for resource access control
 */

/**
 * Check if current user owns the resource
 */
export function checkOwnership(resourceUserId: string | null, currentUserId: string | null): boolean {
  if (!resourceUserId || !currentUserId) {
    return false;
  }
  return resourceUserId === currentUserId;
}

/**
 * Check if current user owns the resource or is admin
 */
export function checkOwnershipOrAdmin(
  resourceUserId: string | null,
  currentUserId: string | null,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) {
    return true;
  }
  return checkOwnership(resourceUserId, currentUserId);
}

/**
 * Validate ownership and return error response if unauthorized
 * Returns null if authorized, error response object if not
 */
export function validateOwnership(
  resourceUserId: string | null,
  currentUserId: string | null
): { success: false; error: string } | null {
  if (!checkOwnership(resourceUserId, currentUserId)) {
    return { success: false, error: "Not authorized" };
  }
  return null;
}

/**
 * Validate ownership or admin access
 */
export function validateOwnershipOrAdmin(
  resourceUserId: string | null,
  currentUserId: string | null,
  isAdmin: boolean = false
): { success: false; error: string } | null {
  if (!checkOwnershipOrAdmin(resourceUserId, currentUserId, isAdmin)) {
    return { success: false, error: "Not authorized" };
  }
  return null;
}