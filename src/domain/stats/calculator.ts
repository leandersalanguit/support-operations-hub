/**
 * @file calculator.ts
 * @description Pure domain calculation logic for shift dashboard metrics.
 */

import { SupportInteraction } from '../interaction/types';
import { getTodayDateString } from '../interaction/timestamp';
import { ShiftMetrics } from './types';

/**
 * Derives comprehensive shift dashboard metrics in a single O(n) pass.
 *
 * @param interactions - Full collection of all interactions in memory.
 * @param targetDate - Optional target shift date (defaults to local today).
 */
export function calculateShiftMetrics(
  interactions: SupportInteraction[],
  targetDate?: string
): ShiftMetrics {
  const activeDate = targetDate || getTodayDateString();

  let totalToday = 0;
  let solvedCount = 0;
  let inEventCount = 0;
  let followUpCount = 0;
  let callCount = 0;
  let chatCount = 0;

  for (const i of interactions) {
    if (i.date !== activeDate) continue;

    totalToday++;

    if (i.status === 'Solved') {
      solvedCount++;
    }

    if (i.inEvent) {
      inEventCount++;
    }

    if (i.status === 'Need to follow up' || i.status === 'Waiting for an update from client') {
      followUpCount++;
    }

    if (i.channel === 'Call') {
      callCount++;
    } else if (i.channel === 'Chat') {
      chatCount++;
    }
  }

  const resolutionRate = totalToday > 0 ? Math.round((solvedCount / totalToday) * 100) : 0;

  return {
    totalToday,
    totalOverall: interactions.length,
    solvedCount,
    resolutionRate,
    inEventCount,
    followUpCount,
    callCount,
    chatCount,
  };
}
