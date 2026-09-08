/**
 * @file types.ts
 * @description Analytical metrics read-model for shift summary dashboards.
 */

export interface ShiftMetrics {
  totalToday: number;
  totalOverall: number;
  solvedCount: number;
  resolutionRate: number; // e.g. 85 for 85%
  inEventCount: number;
  followUpCount: number;
  callCount: number;
  chatCount: number;
}
