/**
 * LocalStorage persistence layer for the Shift Summary App.
 * Handles saving and loading interactions and user preferences with versioned storage keys.
 */

import { Interaction, ClientRecord } from '../types';

/**
 * The localStorage key for storing interactions data.
 * Versioned to avoid conflicts with future schema changes.
 */
const STORAGE_KEY = 'support_shift_interactions_v1';

/**
 * The localStorage key for remembering the last agent name used.
 */
const LAST_AGENT_KEY = 'support_last_agent_name';

/**
 * Runtime schema validation for Interaction objects loaded from localStorage.
 * Rejects entries with missing or wrong-typed required fields to prevent
 * corrupted or injected data from entering the application state.
 * 
 * @param {unknown} obj - The object to validate.
 * @returns {boolean} True if the object matches the Interaction schema.
 */
function isValidInteraction(obj: unknown): obj is Interaction {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const r = obj as Record<string, unknown>;
  // Check that all required fields exist and match expected types
  return (
    typeof r.id === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.date === 'string' &&
    typeof r.dayOfWeek === 'string' &&
    typeof r.agent === 'string' &&
    typeof r.clientName === 'string' &&
    (r.channel === 'Call' || r.channel === 'Chat') &&
    typeof r.channelDetails === 'string' &&
    typeof r.clientProduct === 'string' &&
    typeof r.caseClassification === 'string' &&
    typeof r.status === 'string' &&
    (typeof r.license === 'string' || typeof r.valid247License === 'boolean') &&
    typeof r.inEvent === 'boolean' &&
    typeof r.firstTimeUser === 'boolean' &&
    typeof r.additionalNotes === 'string'
  );
}

/**
 * Loads and validates interactions from localStorage.
 * Returns an empty array if nothing is stored or on parse failure.
 *
 * @returns {Interaction[]} The list of saved interactions.
 */
export function loadInteractions(): Interaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out any entries that fail schema validation and normalize license
    return parsed.filter(isValidInteraction).map((r: any) => ({
      ...r,
      license:
        r.license ||
        (r.valid247License
          ? 'support_active'
          : r.inactiveSupportOption === 'Renewal Sent'
          ? 'renewal_sent'
          : 'support_inactive'),
    }));
  } catch (error) {
    console.error('Failed to load interactions from localStorage:', error);
    return [];
  }
}

/**
 * Serializes and saves interactions to localStorage.
 *
 * @param {Interaction[]} interactions - The interactions to save.
 * @returns {boolean} `true` on success, `false` if the write failed (e.g. quota exceeded).
 */
export function saveInteractions(interactions: Interaction[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(interactions));
    return true;
  } catch (error) {
    console.error('Failed to save interactions to localStorage:', error);
    return false;
  }
}

/**
 * Retrieves the last-used agent name from localStorage.
 *
 * @returns {string} The saved agent name, or an empty string if not found.
 */
export function loadLastAgent(): string {
  return localStorage.getItem(LAST_AGENT_KEY) || '';
}

/**
 * Persists the agent name for auto-fill on the next form use.
 *
 * @param {string} agent - The agent name to save.
 */
export function saveLastAgent(agent: string): void {
  // Only save if the trimmed string is not empty
  if (agent.trim()) {
    localStorage.setItem(LAST_AGENT_KEY, agent.trim());
  }
}

const FORM_VIEW_MODE_KEY = 'support_shift_form_view_mode';

/**
 * Loads the user's preferred form view mode ('grid' | 'vertical') from localStorage.
 * Defaults to 'vertical' for a clean vertical workflow.
 *
 * @returns {'grid' | 'vertical'} The saved view mode.
 */
export function loadFormViewMode(): 'grid' | 'vertical' {
  try {
    const saved = localStorage.getItem(FORM_VIEW_MODE_KEY);
    if (saved === 'grid' || saved === 'vertical') {
      return saved;
    }
  } catch (error) {
    console.error('Failed to load form view mode:', error);
  }
  return 'vertical';
}

/**
 * Saves the user's preferred form view mode to localStorage.
 *
 * @param {'grid' | 'vertical'} mode - The view mode to persist.
 */
export function saveFormViewMode(mode: 'grid' | 'vertical'): void {
  try {
    localStorage.setItem(FORM_VIEW_MODE_KEY, mode);
  } catch (error) {
    console.error('Failed to save form view mode:', error);
  }
}

/**
 * The localStorage key for storing relational clients data.
 */
const CLIENTS_STORAGE_KEY = 'support_shift_clients_v1';

/**
 * Validates a ClientRecord loaded from localStorage.
 */
function isValidClientRecord(obj: unknown): obj is ClientRecord {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    (r.phoneNumber === undefined || typeof r.phoneNumber === 'string') &&
    (r.phoneNumbers === undefined || (Array.isArray(r.phoneNumbers) && r.phoneNumbers.every((p) => typeof p === 'string'))) &&
    Array.isArray(r.ownedProducts) &&
    r.ownedProducts.every((p) => typeof p === 'string') &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string' &&
    (r.lastLoggedBy === undefined || typeof r.lastLoggedBy === 'string')
  );
}

/**
 * Loads and validates client records from localStorage.
 * Returns an empty array if nothing is stored.
 *
 * @returns {ClientRecord[]} The list of saved clients.
 */
export function loadClients(): ClientRecord[] {
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidClientRecord).map((c) => {
      const parsedNumbers = Array.isArray(c.phoneNumbers) && c.phoneNumbers.length > 0
        ? c.phoneNumbers
        : (c.phoneNumber ? c.phoneNumber.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean) : []);
      return {
        ...c,
        phoneNumbers: parsedNumbers,
        phoneNumber: c.phoneNumber || parsedNumbers[0] || undefined,
      };
    });
  } catch (error) {
    console.error('Failed to load clients from localStorage:', error);
    return [];
  }
}

/**
 * Serializes and saves client records to localStorage.
 *
 * @param {ClientRecord[]} clients - The clients list to save.
 * @returns {boolean} True on success.
 */
export function saveClients(clients: ClientRecord[]): boolean {
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    return true;
  } catch (error) {
    console.error('Failed to save clients to localStorage:', error);
    return false;
  }
}

