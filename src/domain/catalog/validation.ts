/**
 * @file validation.ts
 * @description Pure domain validation and sanitization helpers for catalog product management.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Strips leading/trailing whitespace, collapses internal multiple spaces,
 * and removes harmful control characters.
 */
export function sanitizeCatalogProductName(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .replace(/\s+/g, ' ')                          // collapse multi spaces, tabs, newlines first
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // strip remaining control chars
    .trim();
}

/**
 * Validates a catalog product name for additions or renames:
 * - Must not be empty
 * - Must be between 2 and 100 characters
 * - Must not collide with existing catalog products (case-insensitive)
 * - If currentName is provided (during rename), allows keeping the same name
 */
export function validateCatalogProductName(
  name: string,
  existingNames: string[] = [],
  currentName?: string
): ValidationResult {
  const sanitized = sanitizeCatalogProductName(name);

  if (!sanitized) {
    return {
      isValid: false,
      error: 'Product name cannot be empty.',
    };
  }

  if (sanitized.length < 2) {
    return {
      isValid: false,
      error: 'Product name must be at least 2 characters.',
    };
  }

  if (sanitized.length > 100) {
    return {
      isValid: false,
      error: 'Product name cannot exceed 100 characters.',
    };
  }

  const normalizedTarget = sanitized.toLowerCase();
  const normalizedCurrent = currentName ? sanitizeCatalogProductName(currentName).toLowerCase() : null;

  const isDuplicate = existingNames.some((existing) => {
    const norm = sanitizeCatalogProductName(existing).toLowerCase();
    if (normalizedCurrent && norm === normalizedCurrent) {
      return false; // permitted when renaming to exact same name
    }
    return norm === normalizedTarget;
  });

  if (isDuplicate) {
    return {
      isValid: false,
      error: `A product named "${sanitized}" already exists in the catalog.`,
    };
  }

  return { isValid: true };
}
