// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { tick } from 'svelte';

beforeEach(() => {
  localStorage.clear();
  if (!globalThis.crypto) globalThis.crypto = { randomUUID: () => 'test-uuid' };
});

describe('Session boss-flow (jsdom)', () => {
  it('boss-intro → "Versla hem" → toont een vraag zonder runtime-error', async () => {
    const { activeSession } = await import('../stores/ui.js');
    const { buildBossSession } = await import('./session.js');
    const { questionById } = await import('./content.js');
    const Session = (await import('../screens/Session.svelte')).default;

    const ids = buildBossSession('m0');
    expect(ids.length).toBeGreaterThan(0);
    activeSession.set({ ids, mode: 'boss', moduleId: 'm0' });

    const target = document.body.appendChild(document.createElement('div'));
    const app = new Session({ target });
    await tick();

    // De eindbaas-intro toont Sjef.
    expect(target.textContent).toContain('Sjef');
    const startBtn = [...target.querySelectorAll('button')].find((b) => /Versla hem/i.test(b.textContent));
    expect(startBtn).toBeTruthy();

    // Dit klikpad triggerde de bug (startQuestion gooide een ReferenceError).
    startBtn.click();
    await tick();
    await new Promise((r) => setTimeout(r, 10));

    // De eerste boss-vraag rendert nu daadwerkelijk.
    const firstPrompt = questionById[ids[0]].prompt.slice(0, 24);
    expect(target.textContent).toContain(firstPrompt);
    app.$destroy();
  });
});
