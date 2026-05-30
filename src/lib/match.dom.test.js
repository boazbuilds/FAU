// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import MatchQuestion from '../components/MatchQuestion.svelte';

const question = {
  id: 'mtest', type: 'match', prompt: 'test',
  pairs: [
    { id: 'p0', left: 'A', right: 'Alpha' },
    { id: 'p1', left: 'B', right: 'Beta' }
  ]
};

describe('MatchQuestion interactie', () => {
  it('rendert kolommen, koppelt en enabled de knop pas bij volledig', async () => {
    const target = document.body.appendChild(document.createElement('div'));
    let result = null;
    const c = new MatchQuestion({ target, props: { question } });
    c.$on('answer', (e) => (result = e.detail));
    await tick();

    const btns = () => [...target.querySelectorAll('button')];
    // 2 links + 2 rechts + Controleer = 5
    expect(btns().length).toBe(5);

    const byText = (t) => btns().find((b) => b.textContent.trim() === t);
    const controleer = () => btns().find((b) => b.textContent.includes('Controleer'));
    expect(controleer().disabled).toBe(true);

    // koppel A→Alpha
    byText('A').click(); await tick();
    byText('Alpha').click(); await tick();
    expect(controleer().disabled).toBe(true); // pas 1/2

    // koppel B→Beta
    byText('B').click(); await tick();
    byText('Beta').click(); await tick();
    expect(controleer().disabled).toBe(false); // 2/2 → enabled

    controleer().click(); await tick();
    expect(result).toBeTruthy();
    expect(result.result).toBe('correct');
    c.$destroy();
  });
});
