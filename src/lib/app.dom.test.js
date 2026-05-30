// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  if (!globalThis.crypto) globalThis.crypto = { randomUUID: () => 'test-uuid' };
});

describe('App mount (jsdom)', () => {
  it('mount het pad-scherm zonder runtime-errors en toont modules', async () => {
    const App = (await import('../App.svelte')).default;
    const target = document.body.appendChild(document.createElement('div'));
    const app = new App({ target });
    await new Promise((r) => setTimeout(r, 50));
    const html = target.innerHTML;
    expect(html.length).toBeGreaterThan(200);
    // bewijs dat het echte leerpad rendert
    expect(html).toContain('Dagdoel');
    expect(html).toContain('Fundamenten'); // module m0 titel
    // mascotte (humor-laag) is gewired en rendert
    expect(html).toContain('Rekenmachine');
    app.$destroy();
  });

  it('heeft na mount een gemigreerd v2-profiel in de store', async () => {
    const App = (await import('../App.svelte')).default;
    const { profile } = await import('../stores/profile.js');
    const { get } = await import('svelte/store');
    const target = document.body.appendChild(document.createElement('div'));
    const app = new App({ target });
    await new Promise((r) => setTimeout(r, 50));
    const p = get(profile);
    expect(p.v).toBe(2);
    expect(p.userId).toBeTruthy();
    expect(p.week).toBeTruthy();
    app.$destroy();
  });
});
