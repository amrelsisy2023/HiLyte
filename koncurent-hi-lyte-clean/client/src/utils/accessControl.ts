// Access control utilities for Koncurent Hi-LYTE

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

// Admin users with full access to AI Dashboard and administrative features
const ADMIN_EMAILS = [
  'mohamed@koncurent.com',
  'ryan@koncurent.com', 
  'kevin@koncurent.com'
];

// Check if user has a Koncurent email address
export function isKoncurrentUser(user: User | null): boolean {
  if (!user?.email) return false;
  return user.email.endsWith('@koncurent.com');
}

// Check if user is a Koncurent admin
export function isKoncurrentAdmin(user: User | null): boolean {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// Check if user can access AI Dashboard
export function canAccessAIDashboard(user: User | null): boolean {
  return isKoncurrentUser(user);
}

// Check if user can access admin features
export function canAccessAdminFeatures(user: User | null): boolean {
  return isKoncurrentAdmin(user);
}

// Get user access level
export function getUserAccessLevel(user: User | null): 'admin' | 'koncurent' | 'public' {
  if (isKoncurrentAdmin(user)) return 'admin';
  if (isKoncurrentUser(user)) return 'koncurent';
  return 'public';
}