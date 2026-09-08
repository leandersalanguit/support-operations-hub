/**
 * Date utility functions for the Support Operations Hub.
 * Re-exports canonical implementation from domain layer for backward-compatibility.
 */
export {
  DAYS_OF_WEEK,
  getTodayDateString,
  getDayOfWeekFromDate,
  formatDateDisplay,
  formatTimeDisplay,
  getCurrentTimeString,
  resolveInteractionTimestamp,
  type LogTimestamp,
} from '../domain/interaction/timestamp';

