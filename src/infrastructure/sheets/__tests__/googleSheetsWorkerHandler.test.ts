import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGoogleSheetsSyncHandler, isValidGoogleSheetsEvent } from '../googleSheetsSyncHandler';

const options = (overrides: Record<string, unknown> = {}) => ({
  workerSecret: 'worker-secret-for-tests',
  allowedOrigins: ['https://support.example.test'],
  claimEvents: vi.fn().mockResolvedValue([]),
  deliverEvent: vi.fn().mockResolvedValue(undefined),
  completeEvent: vi.fn().mockResolvedValue(true),
  retryEvent: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const request = (headers: Record<string, string> = {}, body = '{}') => new Request(
  'https://functions.example.test/google-sheets-sync',
  { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body },
);

describe('Google Sheets sync worker handler', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects requests without the worker secret before claiming events', async () => {
    const deps = options();
    const response = await createGoogleSheetsSyncHandler(deps)(request());

    expect(response.status).toBe(401);
    expect(deps.claimEvents).not.toHaveBeenCalled();
  });

  it('rejects browser origins even when a caller has the worker secret', async () => {
    const deps = options();
    const response = await createGoogleSheetsSyncHandler(deps)(request({
      'x-worker-secret': 'worker-secret-for-tests',
      origin: 'https://attacker.example.test',
    }));

    expect(response.status).toBe(403);
    expect(deps.claimEvents).not.toHaveBeenCalled();
  });

  it('rejects unexpected request fields and oversized bodies', async () => {
    const deps = options();
    const handler = createGoogleSheetsSyncHandler(deps);
    const headers = { 'x-worker-secret': 'worker-secret-for-tests' };

    expect((await handler(request(headers, '{"events":[]}'))).status).toBe(400);
    expect((await handler(request(headers, '"' + 'x'.repeat(2100) + '"'))).status).toBe(400);
    expect(deps.claimEvents).not.toHaveBeenCalled();
  });

  it('delivers insert, update, and delete events and marks each complete', async () => {
    const events = ['insert', 'update', 'delete'].map((action, index) => ({
      id: index + 1,
      leaseId: `lease-${index + 1}`,
      action,
      version: index + 1,
      payload: { id: `interaction-${index + 1}` },
    }));
    const deps = options({ claimEvents: vi.fn().mockResolvedValue(events) });
    const response = await createGoogleSheetsSyncHandler(deps)(request({
      'x-worker-secret': 'worker-secret-for-tests',
    }));

    expect(response.status).toBe(200);
    expect(deps.claimEvents).toHaveBeenCalledWith(5);
    expect(deps.deliverEvent.mock.calls.map(([event]) => event.action)).toEqual(['insert', 'update', 'delete']);
    expect(deps.completeEvent).toHaveBeenCalledTimes(3);
    expect(deps.retryEvent).not.toHaveBeenCalled();
  });

  it('records a bounded retry error and continues with other claimed events', async () => {
    const events = [
      { id: 11, leaseId: 'lease-11', action: 'insert', version: 1, payload: { id: 'item-11' } },
      { id: 12, leaseId: 'lease-12', action: 'update', version: 2, payload: { id: 'item-12' } },
    ];
    const deps = options({
      claimEvents: vi.fn().mockResolvedValue(events),
      deliverEvent: vi.fn().mockRejectedValueOnce(new Error('private token should not be returned'))
        .mockResolvedValueOnce(undefined),
    });
    const response = await createGoogleSheetsSyncHandler(deps)(request({
      'x-worker-secret': 'worker-secret-for-tests',
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toEqual({ processed: 1, retried: 1 });
    expect(deps.retryEvent).toHaveBeenCalledWith(11, 'lease-11', 'upstream_failure');
    expect(deps.completeEvent).toHaveBeenCalledWith(12, 'lease-12');
    expect(JSON.stringify(result)).not.toContain('private token');
  });

  it('accepts database timestamps with six fractional digits', () => {
    expect(isValidGoogleSheetsEvent({
      id: 1,
      leaseId: 'b90e4bf4-4d7e-4b81-90a3-8ce2d01c51a8',
      action: 'update',
      version: 2,
      payload: {
        id: 'd90e4bf4-4d7e-4b81-90a3-8ce2d01c51a8',
        createdAt: '2026-10-24T01:30:00.123456+00:00',
        date: '2026-10-24',
        dayOfWeek: 'Saturday',
        time: '09:30:00',
        agent: 'Agent A',
        clientName: 'Client A',
        channel: 'Call',
        channelDetails: '',
        clientProduct: 'Widget',
        caseClassification: 'Other',
        status: 'Solved',
        license: 'support_active',
        inEvent: false,
        firstTimeUser: false,
        additionalNotes: '',
      },
    })).toBe(true);
  });

  it('rejects extra event fields before the Apps Script request', () => {
    const payload = {
      id: 'd90e4bf4-4d7e-4b81-90a3-8ce2d01c51a8',
      createdAt: '2026-10-24T01:30:00.123456+00:00',
      date: '2026-10-24', dayOfWeek: 'Saturday', time: '09:30:00', agent: 'Agent A',
      clientName: 'Client A', channel: 'Call', channelDetails: '', clientProduct: 'Widget',
      caseClassification: 'Other', status: 'Solved', license: 'support_active', inEvent: false,
      firstTimeUser: false, additionalNotes: '', email: 'private@example.test',
    };
    expect(isValidGoogleSheetsEvent({
      id: 1, leaseId: 'b90e4bf4-4d7e-4b81-90a3-8ce2d01c51a8', action: 'update', version: 2, payload,
    })).toBe(false);
  });
});
