import { describe, expect, it, vi } from 'vitest';
import { createPasswordChangeHandler } from '../../../../supabase/functions/complete-password-change/handler';

const makeDeps = () => ({
  allowedOrigins: ['https://support.example.test'],
  verifyUser: vi.fn(async (token: string) => token === 'valid' ? { id: 'user-a' } : null),
  getAccessState: vi.fn(async () => ({ active: true })),
  consumeAttempt: vi.fn(async () => true),
  updatePassword: vi.fn(async () => undefined),
  completePasswordChange: vi.fn(async () => true),
});
const request = (body: unknown, authorization = 'Bearer valid', origin = 'https://support.example.test') =>
  new Request('https://project.test/functions/v1/complete-password-change', {
    method: 'POST',
    headers: { authorization, origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('complete-password-change handler', () => {
  it('requires a verified bearer token and does not accept a caller target ID', async () => {
    const deps = makeDeps();
    const handler = createPasswordChangeHandler(deps);
    expect((await handler(request({ newPassword: 'abcdefghijkl' }, 'Bearer invalid'))).status).toBe(401);
    expect((await handler(request({ newPassword: 'abcdefghijkl', userId: 'user-b' }))).status).toBe(400);
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });

  it('rejects unknown fields and passwords outside 12–128 characters', async () => {
    const deps = makeDeps();
    const handler = createPasswordChangeHandler(deps);
    expect((await handler(request({ newPassword: 'abcdefghijkl', userId: 'user-b' }))).status).toBe(400);
    expect((await handler(request({ newPassword: 'short' }))).status).toBe(400);
    expect((await handler(request({ newPassword: 'x'.repeat(129) }))).status).toBe(400);
  });

  it('limits bodies to 2 KiB and rejects inactive staff', async () => {
    const deps = makeDeps();
    const handler = createPasswordChangeHandler(deps);
    const oversized = new Request('https://project.test/functions/v1/complete-password-change', {
      method: 'POST', headers: { authorization: 'Bearer valid', origin: 'https://support.example.test' },
      body: `{"newPassword":"${'x'.repeat(2100)}"}`,
    });
    expect((await handler(oversized)).status).toBe(400);
    expect(deps.updatePassword).not.toHaveBeenCalled();
    deps.getAccessState.mockResolvedValueOnce({ active: false });
    expect((await handler(request({ newPassword: 'abcdefghijkl' }))).status).toBe(403);
  });

  it('cancels an oversized body stream when no Content-Length is supplied', async () => {
    const deps = makeDeps();
    const handler = createPasswordChangeHandler(deps);
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1500));
        controller.enqueue(new Uint8Array(700));
      },
      cancel,
    });
    const oversizedWithoutLength = new Request('https://project.test/functions/v1/complete-password-change', {
      method: 'POST',
      headers: { authorization: 'Bearer valid', origin: 'https://support.example.test' },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    expect(oversizedWithoutLength.headers.has('content-length')).toBe(false);
    expect((await handler(oversizedWithoutLength)).status).toBe(400);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(deps.verifyUser).not.toHaveBeenCalled();
    expect(deps.consumeAttempt).not.toHaveBeenCalled();
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });

  it('uses the verified user, applies the persistent limit, and records no password data', async () => {
    const deps = makeDeps();
    const handler = createPasswordChangeHandler(deps);
    expect((await handler(request({ newPassword: 'abcdefghijkl' }))).status).toBe(200);
    expect(deps.consumeAttempt).toHaveBeenCalledWith('user-a');
    expect(deps.updatePassword).toHaveBeenCalledWith('user-a', 'abcdefghijkl');
    expect(deps.completePasswordChange).toHaveBeenCalledWith('user-a');
    deps.consumeAttempt.mockResolvedValueOnce(false);
    expect((await handler(request({ newPassword: 'abcdefghijkl' }))).status).toBe(429);
  });

  it('leaves the required state uncleared after provider or completion failure', async () => {
    const deps = makeDeps();
    const handler = createPasswordChangeHandler(deps);
    deps.updatePassword.mockRejectedValueOnce(new Error('private provider detail'));
    expect((await handler(request({ newPassword: 'abcdefghijkl' }))).status).toBe(503);
    expect(deps.completePasswordChange).not.toHaveBeenCalled();
    deps.completePasswordChange.mockResolvedValueOnce(false);
    expect((await handler(request({ newPassword: 'abcdefghijkl' }))).status).toBe(503);
    expect((await handler(request({ newPassword: 'abcdefghijkl' }))).status).toBe(200);
    expect(deps.updatePassword).toHaveBeenCalledTimes(3);
  });
});
