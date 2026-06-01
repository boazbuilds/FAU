// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { tick } from 'svelte';

beforeEach(() => {
  localStorage.clear();
  if (!globalThis.crypto) globalThis.crypto = { randomUUID: () => 'test-uuid' };
});

describe('Eindbaas casus_bouw (jsdom)', () => {
  it('boss ins0 → intro → bouwstenen + slots renderen en Controleer werkt', async () => {
    const { activeSession } = await import('../stores/ui.js');
    const { buildBossSession } = await import('./session.js');
    const { questionById } = await import('./content.js');
    const Session = (await import('../screens/Session.svelte')).default;

    const ids = buildBossSession('ins0');
    const firstCasus = ids.find((id) => questionById[id].type === 'build');
    expect(firstCasus).toBeTruthy();
    activeSession.set({ ids: [firstCasus], mode: 'boss', moduleId: 'ins0' });

    const target = document.body.appendChild(document.createElement('div'));
    const app = new Session({ target });
    await tick();

    // Eindbaas-intro → "Versla hem"
    const startBtn = [...target.querySelectorAll('button')].find((b) => /Versla hem/i.test(b.textContent));
    expect(startBtn).toBeTruthy();
    startBtn.click();
    await tick();
    await new Promise((r) => setTimeout(r, 10));

    // De bouwsteen-UI rendert: pot-label + minstens één slot-label + de Controleer-knop.
    expect(target.textContent).toContain('Bouwstenen');
    expect(target.textContent).toContain('Casus-feit'); // slot s1 label van ins0-c-q1
    const checkBtn = [...target.querySelectorAll('button')].find((b) => /Controleer/i.test(b.textContent));
    expect(checkBtn).toBeTruthy();

    // Inzenden zonder iets te plaatsen → feedback met punten-score verschijnt (geen crash).
    checkBtn.click();
    await tick();
    expect(target.textContent).toMatch(/van de 8 punten/);

    app.$destroy();
  });
});
