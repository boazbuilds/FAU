<script>
  // Gedeelde feedback-balk onder een vraag (Session/Blitz/Deadline). Toont de
  // uitslag-kleur, een kop, eventuele bron (📖) + uitleg + tip, en een 'volgende'-knop.
  // Schermspecifieke extra's via slots: "headRight" (rechts van de kop), "head"
  // (onder de kop, bv. bonus/combo) en "actions" (vóór de knop, bv. beoordelen).
  import { createEventDispatcher } from 'svelte';

  export let result = 'wrong'; // 'correct' | 'partial' | 'wrong'
  export let headline = null; // override; anders afgeleid van de uitslag
  export let explanation = '';
  export let tip = null; // { title, body } | null
  export let refLabel = null; // bv. "Standaard 240.31"
  export let nextLabel = 'Volgende ▶';

  const dispatch = createEventDispatcher();

  const PANEL = {
    correct: 'border-emerald-700 bg-emerald-950/95',
    partial: 'border-amber-700 bg-amber-950/95',
    wrong: 'border-rose-800 bg-rose-950/95'
  };
  const HEAD = {
    correct: 'text-emerald-300',
    partial: 'text-amber-300',
    wrong: 'text-rose-300 animate-shake'
  };
  const DEFAULT_HEAD = { correct: 'Goed!', partial: 'Deels', wrong: 'Fout' };
  $: panel = PANEL[result] ?? PANEL.wrong;
  $: headColor = HEAD[result] ?? HEAD.wrong;
  $: headText = headline ?? DEFAULT_HEAD[result] ?? '';
</script>

<div class="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md animate-floatup border-t p-4 {panel}">
  <div class="mb-1.5 flex items-center justify-between gap-2">
    <span class="min-w-0 font-pixel text-[11px] uppercase tracking-wide {headColor}">{headText}</span>
    <slot name="headRight" />
  </div>
  <slot name="head" />
  {#if refLabel}
    <p class="mb-1 font-pixel text-[10px] uppercase tracking-wide neon-cyan">📖 {refLabel}</p>
  {/if}
  <p class="text-sm leading-relaxed text-slate-200">{explanation}</p>
  {#if tip}
    <p class="mt-2 rounded-lg bg-slate-900/60 p-2 text-xs leading-relaxed text-indigo-200">
      <span class="font-semibold">💡 {tip.title}:</span> {tip.body}
    </p>
  {/if}
  <slot name="actions" />
  <button class="btn-arcade mt-3 w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={() => dispatch('next')}>
    {nextLabel}
  </button>
</div>
