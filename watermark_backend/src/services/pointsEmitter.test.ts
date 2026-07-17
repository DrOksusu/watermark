import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emitPointEvent } from './pointsEmitter';

// 전역 fetch를 mock — 실제 네트워크 없이 발행 로직만 검증
describe('emitPointEvent (watermark)', () => {
  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = 'test-secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 201 }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.INTERNAL_API_SECRET;
  });

  const base = {
    externalId: 'portal-user-1',
    action: 'processed',
    sourceRef: 'processed-image-1',
    occurredAt: new Date('2026-07-10T00:00:00.000Z'),
  };

  it('POST body에 serviceCode=watermark, userId=externalId, sourceRef 정확', async () => {
    await emitPointEvent(base);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/auth/internal/points');
    expect(opts.headers['x-internal-secret']).toBe('test-secret');
    expect(JSON.parse(opts.body)).toEqual({
      userId: 'portal-user-1',
      serviceCode: 'watermark',
      action: 'processed',
      sourceRef: 'processed-image-1',
      occurredAt: '2026-07-10T00:00:00.000Z',
    });
  });

  it('INTERNAL_API_SECRET 미설정 → skip(fetch 미호출)', async () => {
    delete process.env.INTERNAL_API_SECRET;
    await emitPointEvent(base);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('externalId 없음 → skip(fetch 미호출)', async () => {
    await emitPointEvent({ ...base, externalId: '' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetch 실패(res.ok=false)해도 예외를 던지지 않음', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(emitPointEvent(base)).resolves.toBeUndefined();
  });

  it('fetch 예외(네트워크 오류)여도 예외를 던지지 않음', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    await expect(emitPointEvent(base)).resolves.toBeUndefined();
  });
});
