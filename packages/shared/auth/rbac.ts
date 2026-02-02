import type { UserRole } from '@mytutorapp/shared/types/ShopContextTypes';

export const RoleOrder = {
  user: 0,
  admin: 1,
  superadmin: 2,
} as const;

export function hasRoleAtLeast(current: UserRole, required: UserRole): boolean {
  if (!current || !required) return false;
  
  return RoleOrder[current] >= RoleOrder[required];
}

export function isAdmin(current: UserRole): boolean {
  return hasRoleAtLeast(current, 'admin');
}

export function isSuperAdmin(current: UserRole): boolean {
  return current === 'superadmin';
}
