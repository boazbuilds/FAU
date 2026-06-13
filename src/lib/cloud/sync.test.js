import { describe, it, expect, vi } from 'vitest';
import { withTimeout } from './sync.js';

// Borgt dat geen enkele cloud-aanroep (auth én database) de UI eindeloos kan laten
// hangen: een trage/vastgelopen request verwerpt na de time-out i.p.v. te blijven staan.
describe('withTimeout — inloggen kan nooit eindeloos hangen', () => {
  it('lost op met de echte waarde als de aanroep op tijd klaar is', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });

  it('adopteert ook een Supabase-achtige thenable', async () => {
    const thenable = { then: (res) => res({ data: 1, error: null }) };
    await expect(withTimeout(thenable, 50)).resolves.toEqual({ data: 1, error: null });
  });

  it('verwerpt na de time-out als de aanroep blijft hangen', async () => {
    vi.useFakeTimers();
    try {
      const never = new Promise(() => {}); // lost nooit op, zoals een vastgelopen request
      const p = withTimeout(never, 12000, 'time-out');
      const assertion = expect(p).rejects.toThrow('time-out');
      await vi.advanceTimersByTimeAsync(12000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
