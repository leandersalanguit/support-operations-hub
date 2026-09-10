/**
 * LocalStorage preference helpers for the Support Operations Hub UI.
 * Retains UI view mode and last-used agent preferences across sessions.
 * Core domain entities (Interactions, Clients) are managed via Repository/Offline queue layers.
 */

/**
 * The localStorage key for remembering the last agent name used.
 */
const LAST_AGENT_KEY = 'support_last_agent_name';

/**
 * The localStorage key for remembering the preferred form view mode.
 */
const FORM_VIEW_MODE_KEY = 'support_shift_form_view_mode';

/**
 * Retrieves the last-used agent name from localStorage.
 *
 * @returns {string} The saved agent name, or an empty string if not found.
 */
export function loadLastAgent(): string {
  try {
    return localStorage.getItem(LAST_AGENT_KEY) || '';
  } catch (error) {
    console.error('Failed to load last agent from localStorage:', error);
    return '';
  }
}

/**
 * Persists the agent name for auto-fill on the next form use.
 *
 * @param {string} agent - The agent name to save.
 */
export function saveLastAgent(agent: string): void {
  try {
    if (agent.trim()) {
      localStorage.setItem(LAST_AGENT_KEY, agent.trim());
    }
  } catch (error) {
    console.error('Failed to save last agent to localStorage:', error);
  }
}

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


