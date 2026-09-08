/**
 * @file interactionFilters.ts
 * @description Pure utility functions for searching, filtering, and sorting interaction log records.
 */

import { Interaction } from '../types';
import { formatAgentDisplayName } from '../domain';
import { getTodayDateString } from './date';

export interface InteractionFilterCriteria {
  /** Search text matched across client, agent, product, classification, details, and notes */
  searchTerm?: string;
  /** Date filter mode */
  dateFilter?: 'ALL' | 'TODAY' | 'CUSTOM';
  /** Selected custom date in YYYY-MM-DD format (used when dateFilter is 'CUSTOM') */
  customDate?: string;
  /** Channel filter ('ALL' or specific channel like 'Call', 'Chat') */
  selectedChannel?: string;
  /** Status filter ('ALL' or specific status name) */
  selectedStatus?: string;
  /** Product filter ('ALL' or specific product name) */
  selectedProduct?: string;
  /** Flag to filter only in-event interactions */
  inEventOnly?: boolean;
  /** Reference string for today's date (defaults to getTodayDateString()) */
  todayDate?: string;
}

/**
 * Extracts a comparable HH:mm:ss time value from an interaction.
 * Uses the explicit time field if present, otherwise parses createdAt ISO string.
 *
 * @param {Interaction} item - The interaction record.
 * @returns {string} The formatted HH:mm:ss time string.
 */
export function getInteractionTimeValue(item: Interaction): string {
  if (item.time) {
    return item.time;
  }
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
  }
  return '00:00:00';
}

/**
 * Filters an array of interactions based on criteria including text search, date, channel, status, product, and event status.
 *
 * @param {Interaction[]} items - Array of interactions to filter.
 * @param {InteractionFilterCriteria} criteria - The active filter criteria.
 * @returns {Interaction[]} Filtered array of interactions.
 */
export function filterInteractions(
  items: Interaction[],
  criteria: InteractionFilterCriteria
): Interaction[] {
  const {
    searchTerm = '',
    dateFilter = 'ALL',
    customDate = '',
    selectedChannel = 'ALL',
    selectedStatus = 'ALL',
    selectedProduct = 'ALL',
    inEventOnly = false,
    todayDate = getTodayDateString(),
  } = criteria;

  const normalizedSearch = searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    // 1. Text search across multiple fields
    if (normalizedSearch) {
      const matchesClient = item.clientName.toLowerCase().includes(normalizedSearch);
      const formattedAgent = formatAgentDisplayName(item.agent).toLowerCase();
      const matchesAgent =
        item.agent.toLowerCase().includes(normalizedSearch) ||
        formattedAgent.includes(normalizedSearch);
      const matchesProduct = item.clientProduct.toLowerCase().includes(normalizedSearch);
      const matchesClass = item.caseClassification.toLowerCase().includes(normalizedSearch);
      const matchesDetails = item.channelDetails.toLowerCase().includes(normalizedSearch);
      const matchesNotes = item.additionalNotes.toLowerCase().includes(normalizedSearch);

      if (
        !matchesClient &&
        !matchesAgent &&
        !matchesProduct &&
        !matchesClass &&
        !matchesDetails &&
        !matchesNotes
      ) {
        return false;
      }
    }

    // 2. Date filter
    if (dateFilter === 'TODAY' && item.date !== todayDate) return false;
    if (dateFilter === 'CUSTOM' && item.date !== customDate) return false;

    // 3. Channel filter
    if (selectedChannel !== 'ALL' && item.channel !== selectedChannel) return false;

    // 4. Status filter
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

    // 5. Product filter
    if (selectedProduct !== 'ALL' && item.clientProduct !== selectedProduct) return false;

    // 6. In-Event filter
    if (inEventOnly && !item.inEvent) return false;

    return true;
  });
}

/**
 * Sorts interactions by date and operational time.
 *
 * Sorting priority:
 * 1. Date string comparison according to dateSortOrder ('desc' = newest date first, 'asc' = oldest date first).
 * 2. On the same date, secondary sort is ALWAYS newest time first regardless of dateSortOrder.
 * 3. Tertiary fallback uses createdAt timestamp.
 * 4. Quaternary fallback uses interaction ID for stable determinism.
 *
 * @param {Interaction[]} items - Array of interactions to sort.
 * @param {'desc' | 'asc'} dateSortOrder - The primary date sort direction.
 * @returns {Interaction[]} A sorted copy of the interactions array.
 */
export function sortInteractions(
  items: Interaction[],
  dateSortOrder: 'desc' | 'asc' = 'desc'
): Interaction[] {
  return [...items].sort((a, b) => {
    // 1. Primary Sort by Date string
    const dateComparison = a.date.localeCompare(b.date);
    if (dateComparison !== 0) {
      return dateSortOrder === 'desc' ? -dateComparison : dateComparison;
    }

    // 2. Secondary Sort: On the same date, ALWAYS sort newest time first regardless of dateSortOrder
    const timeValA = getInteractionTimeValue(a);
    const timeValB = getInteractionTimeValue(b);
    const timeComp = timeValB.localeCompare(timeValA);
    if (timeComp !== 0) {
      return timeComp;
    }

    // 3. Tertiary Fallback: createdAt timestamp
    const createdA = new Date(a.createdAt || 0).getTime();
    const createdB = new Date(b.createdAt || 0).getTime();
    if (createdB !== createdA) {
      return createdB - createdA;
    }

    // 4. Quaternary Fallback: string ID
    return (b.id || '').localeCompare(a.id || '');
  });
}

/**
 * Combines filtering and sorting in a single pipeline.
 *
 * @param {Interaction[]} items - Raw interactions list.
 * @param {InteractionFilterCriteria} criteria - Filter criteria.
 * @param {'desc' | 'asc'} dateSortOrder - Date sorting direction.
 * @returns {Interaction[]} Filtered and sorted interactions.
 */
export function filterAndSortInteractions(
  items: Interaction[],
  criteria: InteractionFilterCriteria,
  dateSortOrder: 'desc' | 'asc' = 'desc'
): Interaction[] {
  const filtered = filterInteractions(items, criteria);
  return sortInteractions(filtered, dateSortOrder);
}
