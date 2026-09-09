import { describe, it, expect } from 'vitest';
import { calculateShiftMetrics } from '../calculator';
import { SupportInteraction } from '../../interaction/types';

describe('Domain - Shift Metrics Calculator', () => {
  const sampleInteractions: SupportInteraction[] = [
    {
      id: '1',
      date: '2026-09-10',
      dayOfWeek: 'Thursday',
      agent: 'Jim H.',
      clientName: 'Schrute Farms',
      channel: 'Call',
      channelDetails: '+1 570 555 0199',
      clientProduct: 'Dunder Mifflin Workstation',
      caseClassification: 'Hardware Replacement',
      status: 'Solved',
      license: 'support_active',
      inEvent: true,
      firstTimeUser: false,
      additionalNotes: 'Replaced power cable',
      createdAt: '2026-09-10T08:00:00.000Z',
    },
    {
      id: '2',
      date: '2026-09-10',
      dayOfWeek: 'Thursday',
      agent: 'Dwight S.',
      clientName: 'Vance Refrigeration',
      channel: 'Chat',
      channelDetails: 'Helpdesk',
      clientProduct: 'Sabre Document Scanner',
      caseClassification: 'Software Installation',
      status: 'In progress',
      license: 'support_active',
      inEvent: false,
      firstTimeUser: true,
      additionalNotes: 'Driver install in progress',
      createdAt: '2026-09-10T09:00:00.000Z',
    },
    {
      id: '3',
      date: '2026-09-10',
      dayOfWeek: 'Thursday',
      agent: 'Pam B.',
      clientName: 'W.B. Jones',
      channel: 'Call',
      channelDetails: '+1 570 555 0122',
      clientProduct: 'Dunder Mifflin Desk Phone',
      caseClassification: 'Phone & VoIP',
      status: 'Need to follow up',
      license: 'renewal_sent',
      inEvent: true,
      firstTimeUser: false,
      additionalNotes: 'Waiting on telecom carrier',
      createdAt: '2026-09-10T10:00:00.000Z',
    },
    {
      id: '4',
      date: '2026-09-09', // Yesterday
      dayOfWeek: 'Wednesday',
      agent: 'Jim H.',
      clientName: 'Scranton White Pages',
      channel: 'Chat',
      channelDetails: 'Helpdesk',
      clientProduct: 'Dunder Mifflin Email',
      caseClassification: 'General Inquiry',
      status: 'Solved',
      license: 'support_active',
      inEvent: false,
      firstTimeUser: false,
      additionalNotes: 'Password reset',
      createdAt: '2026-09-09T14:00:00.000Z',
    },
  ];

  it('calculates metrics strictly for the target date in O(n) pass', () => {
    const metrics = calculateShiftMetrics(sampleInteractions, '2026-09-10');

    expect(metrics.totalToday).toBe(3);
    expect(metrics.totalOverall).toBe(4);
    expect(metrics.solvedCount).toBe(1);
    expect(metrics.resolutionRate).toBe(33); // 1 / 3 = 33%
    expect(metrics.inEventCount).toBe(2);
    expect(metrics.followUpCount).toBe(1);
    expect(metrics.callCount).toBe(2);
    expect(metrics.chatCount).toBe(1);
  });

  it('handles empty interaction arrays gracefully', () => {
    const metrics = calculateShiftMetrics([], '2026-09-10');

    expect(metrics.totalToday).toBe(0);
    expect(metrics.totalOverall).toBe(0);
    expect(metrics.solvedCount).toBe(0);
    expect(metrics.resolutionRate).toBe(0);
  });
});
