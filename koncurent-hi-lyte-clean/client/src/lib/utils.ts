import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str?: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Gets a properly formatted display name from user data
 */
export function getDisplayName(user?: { firstName?: string; username?: string }): string {
  if (!user) return '';
  return capitalize(user.firstName || user.username || '');
}