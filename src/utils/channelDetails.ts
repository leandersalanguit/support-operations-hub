/**
 * @file channelDetails.ts
 * @description Utilities to parse and resolve channel details (phone numbers, helpdesk ticket IDs, external URLs).
 */

import { buildTicketUrl, extractTicketIdFromUrl, getHelpdeskName } from './helpdesk';
import { sanitizePhoneInput, formatPhoneNumber } from '../domain/client/phone';

export interface ParsedChannelDetails {
  /** Type classification of the channel detail string */
  type: 'empty' | 'url' | 'ticket' | 'text';
  /** Original trimmed string */
  raw: string;
  /** Display label for anchor or badge text */
  label: string;
  /** Resolved hyperlink target if the detail is clickable */
  url?: string;
  /** Hover title for tooltip */
  title?: string;
}

/**
 * Parses interaction channel details into structured representation.
 * Handles ticket links, ticket numbers (#12345 or alphanumeric IDs),
 * full HTTP(S) URLs, and phone numbers.
 *
 * @param {string} details - Raw channel details string.
 * @param {string} channel - The communication channel ('Call', 'Chat', etc.).
 * @returns {ParsedChannelDetails} Parsed metadata for display and navigation.
 */
export function parseChannelDetails(details: string, channel: string): ParsedChannelDetails {
  if (!details || !details.trim()) {
    return {
      type: 'empty',
      raw: '',
      label: '—',
    };
  }

  const trimmed = details.trim();

  // 1. Check for full HTTP/HTTPS URL
  const isUrl = /^https?:\/\//i.test(trimmed);
  if (isUrl) {
    const extractedId = extractTicketIdFromUrl(trimmed);
    const label = extractedId ? `#${extractedId}` : 'Link';

    return {
      type: 'url',
      raw: trimmed,
      label,
      url: trimmed,
      title: trimmed,
    };
  }

  // 2. Chat channel: check for ticket ID pattern
  if (channel === 'Chat') {
    const ticketIdMatch = trimmed.match(/^(?:[A-Za-z]{3,12}\s*#?|#)?([A-Za-z0-9-_]{3,20})$/i);
    if (ticketIdMatch) {
      const candidate = ticketIdMatch[1];
      const isPureWord = /^[a-zA-Z]+$/.test(candidate);
      const isPrefixedWithHash = trimmed.startsWith('#');

      // Only treat as ticket ID if it has numbers or an explicit '#' prefix
      if (!isPureWord || isPrefixedWithHash) {
        const ticketUrl = buildTicketUrl(candidate);
        if (ticketUrl) {
          return {
            type: 'ticket',
            raw: trimmed,
            label: `#${candidate}`,
            url: ticketUrl,
            title: `Open ticket: ${ticketUrl}`,
          };
        }

        return {
          type: 'text',
          raw: trimmed,
          label: `#${candidate}`,
          title: `Ticket #${candidate}`,
        };
      }
    }
  }

  // 3. Default text / phone number
  return {
    type: 'text',
    raw: trimmed,
    label: trimmed,
  };
}

/**
 * Normalizes and formats channel details (phone number or chat ticket ID) for submission.
 *
 * For 'Call': Sanitizes and formats the phone number into international standard.
 * For 'Chat': Trims input, prefixes raw numeric IDs with '#', leaves existing URLs/hashes intact,
 * and falls back to configured helpdesk name if empty.
 *
 * @param {'Call' | 'Chat'} channel - Interaction channel.
 * @param {string | undefined | null} rawDetails - User entered phone number or chat ticket reference.
 * @param {string} [fallbackHelpdesk] - Optional override for fallback helpdesk name.
 * @returns {string} Fully formatted channel details string.
 */
export function formatChannelDetailsForSubmit(
  channel: 'Call' | 'Chat',
  rawDetails: string | undefined | null,
  fallbackHelpdesk?: string
): string {
  if (channel === 'Call') {
    return formatPhoneNumber(sanitizePhoneInput(rawDetails || ''));
  }
  const trimmed = (rawDetails || '').trim();
  if (!trimmed) {
    return fallbackHelpdesk || getHelpdeskName();
  }
  if (trimmed.startsWith('#') || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^\d+$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  return trimmed;
}
