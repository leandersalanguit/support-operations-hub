/**
 * @file adminFormValidation.ts
 * @description Pure validation utilities for Admin Dashboard resource creation and updates.
 * Ensures the minimal required fields (Name & Link) are verified, and optional metadata is cleanly normalized.
 */

import { AdminResourceConfig } from './adminResourceConfig';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates whether a string is a well-formed HTTP/HTTPS URL.
 */
export function isValidHttpUrl(urlCandidate: string): boolean {
  if (!urlCandidate || typeof urlCandidate !== 'string') return false;
  const trimmed = urlCandidate.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates resource form values against its schema configuration.
 * Adheres strictly to minimal required field rules (Name & Link) while allowing
 * all other fields to remain optional.
 */
export function validateResourcePayload(
  config: AdminResourceConfig,
  values: Record<string, any>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const val = values[field.key];

    // Check mandatory fields
    if (field.required) {
      if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
        errors[field.key] = `${field.label} is required.`;
        continue;
      }
    }

    // Check URL field format if provided
    if (field.type === 'url' && val && typeof val === 'string' && val.trim().length > 0) {
      if (!isValidHttpUrl(val)) {
        errors[field.key] = 'Please enter a valid URL (starting with http:// or https://).';
      }
    }

    // Number field validation if provided
    if (field.type === 'number' && val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (isNaN(num) || num < 0) {
        errors[field.key] = `${field.label} must be a valid non-negative number.`;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Prepares and sanitizes form values before sending to Supabase.
 * Fills in default values for unsupplied optional fields, trims strings, and cleans arrays.
 */
export function sanitizeResourcePayload(
  config: AdminResourceConfig,
  values: Record<string, any>
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const field of config.fields) {
    const val = values[field.key];

    if (field.type === 'tags') {
      if (Array.isArray(val)) {
        sanitized[field.key] = val.filter((t) => typeof t === 'string' && t.trim().length > 0);
      } else {
        sanitized[field.key] = [];
      }
    } else if (field.type === 'number') {
      if (val !== undefined && val !== null && val !== '') {
        sanitized[field.key] = Number(val);
      } else {
        sanitized[field.key] = null;
      }
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      sanitized[field.key] = trimmed.length > 0 ? trimmed : (field.defaultValue ?? '');
    } else if (val === undefined || val === null) {
      sanitized[field.key] = field.defaultValue ?? null;
    } else {
      sanitized[field.key] = val;
    }
  }

  // Ensure is_active is enabled by default on new items
  if (sanitized.is_active === undefined) {
    sanitized.is_active = true;
  }

  return sanitized;
}
