/**
 * @file helpdesk.ts
 * @description Centralized helper functions for helpdesk and ticketing integration.
 * Resolves ticketing system configuration via environment variables with safe fallbacks
 * and template URL interpolation.
 */

/**
 * Returns the configured base ticket URL from environment variables.
 * Returns null if not set or empty.
 */
export function getHelpdeskBaseUrl(): string | null {
  const url =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_HELPDESK_TICKET_URL
      ? String(import.meta.env.VITE_HELPDESK_TICKET_URL).trim()
      : '';
  return url || null;
}

/**
 * Returns the display name for the helpdesk service from environment variables.
 * Defaults to 'Ticket' if not configured.
 */
export function getHelpdeskName(): string {
  const name =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_HELPDESK_NAME
      ? String(import.meta.env.VITE_HELPDESK_NAME).trim()
      : '';
  return name || 'Ticket';
}

/**
 * Builds a ticket navigation URL for a given ticket identifier.
 * Supports template variables like {id}.
 * If {id} is omitted, appends /${ticketId} to the base URL.
 * Returns null if no helpdesk base URL is configured.
 *
 * @param {string} ticketId - Raw or sanitized ticket identifier.
 * @returns {string | null} Fully resolved URL or null if no base URL configured.
 */
export function buildTicketUrl(ticketId: string): string | null {
  if (!ticketId || !ticketId.trim()) return null;
  const baseUrl = getHelpdeskBaseUrl();
  if (!baseUrl) return null;

  const cleanId = ticketId.trim().replace(/^#+/, '');
  if (!cleanId) return null;

  if (baseUrl.includes('{id}')) {
    return baseUrl.replace('{id}', encodeURIComponent(cleanId));
  }

  const sanitizedBase = baseUrl.replace(/\/+$/, '');
  return `${sanitizedBase}/${encodeURIComponent(cleanId)}`;
}

/**
 * Attempts to extract a ticket identifier from a full URL.
 * Matches common ticket URL patterns: /tickets/123, /ticket/123, /issues/123, /cases/123, /conversation/123
 *
 * @param {string} url - Full HTTP/HTTPS URL.
 * @returns {string | null} Extracted ticket ID or null if unrecognized.
 */
export function extractTicketIdFromUrl(url: string): string | null {
  if (!url || !url.trim()) return null;
  const match = url.match(/(?:tickets?|conversations?|issues?|cases?)\/([A-Za-z0-9-_]+)/i);
  return match ? match[1] : null;
}
