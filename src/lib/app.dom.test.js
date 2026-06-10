// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { guest } from '../stores/auth.js';

beforeEach(() => {
  localStorage.clear();
  if (!globalThis.crypto) globalThis.crypto = { randomUUID: () => 'test-uuid' };
  // Online is in de testomgeving 'geconfigureerd', dus zou het inlogscherm vóór de
  // app verschijnen. We testen de app zelf, dus gaan als gast verder (bypasst de gate).
  guest.set(true);
});

describe('App mount (jsdom)', () => {
  it('mount het modi-startscherm zonder runtime-errors', async () => {
    const App = (await import('../App.svelte')).default;
    const target = document.body.appendChild(document.createElement('div'));
    const app = new App({ target });
    await new Promise((r) => setTimeout(r, 50));
    const html = target.innerHTML;
    expect(html.length).toBeGreaterThan(200);
    // bewijs dat het modi-menu rendert, incl. de tentamen-toggle en de instelling-modi
    expect(html).toContain('Dagdoel');
    expect(html).toContain('Dagmissies'); // dagmissies-paneel
    expect(html).toContain('Instellingstoets'); // tentamen-toggle
    expect(html).toContain('Snel oefenen'); // modus-knop
    expect(html).toContain('Het pad'); // modus-knop
    expect(html).toContain('DEADLINE'); // instelling-modus
    // mascotte (humor-laag) is gewired en rendert
    expect(html).toContain('motivatie-maatje');
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
