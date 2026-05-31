// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tick } from 'svelte';

beforeEach(() => {
  localStorage.clear();
  if (!globalThis.crypto) globalThis.crypto = { randomUUID: () => 'test-uuid' };
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Kennis-Blitz scherm (jsdom)', () => {
  it('intro → Start → toont een vraag, en de klok telt af zonder runtime-error', async () => {
    const Blitz = (await import('../screens/Blitz.svelte')).default;
    const target = document.body.appendChild(document.createElement('div'));
    const app = new Blitz({ target });
    await tick();

    // Intro toont de titel + een Start-knop.
    expect(target.textContent).toContain('Kennis-Blitz');
    const startBtn = [...target.querySelectorAll('button')].find((b) => /Start/i.test(b.textContent));
    expect(startBtn).toBeTruthy();

    startBtn.click();
    await tick();

    // Er rendert een vraag (Controleer-knop of antwoordopties aanwezig).
    expect(target.querySelectorAll('button').length).toBeGreaterThan(0);

    // Klok tikt: na 1s mag er geen crash optreden.
    vi.advanceTimersByTime(1000);
    await tick();
    expect(target.textContent).toMatch(/\d+s/); // resterende seconden zichtbaar

    app.$destroy();
  });
});
