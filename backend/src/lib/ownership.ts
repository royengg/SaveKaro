export function checkOwnership(
  resourceUserId: string | null,
  currentUserId: string | null,
): boolean {
  if (!resourceUserId || !currentUserId) {
    return false;
  }
  return resourceUserId === currentUserId;
}

export function checkOwnershipOrAdmin(
  resourceUserId: string | null,
  currentUserId: string | null,
  isAdmin: boolean = false,
): boolean {
  if (isAdmin) {
    return true;
  }
  return checkOwnership(resourceUserId, currentUserId);
}

export function validateOwnership(
  resourceUserId: string | null,
  currentUserId: string | null,
): { success: false; error: string } | null {
  if (!checkOwnership(resourceUserId, currentUserId)) {
    return { success: false, error: "Not authorized" };
  }
  return null;
}

export function validateOwnershipOrAdmin(
  resourceUserId: string | null,
  currentUserId: string | null,
  isAdmin: boolean = false,
): { success: false; error: string } | null {
  if (!checkOwnershipOrAdmin(resourceUserId, currentUserId, isAdmin)) {
    return { success: false, error: "Not authorized" };
  }
  return null;
}
