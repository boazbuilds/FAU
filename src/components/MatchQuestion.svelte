<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { gradeMatchResult } from '../lib/grading.js';

  export let question;
  export let submitted = false;

  const dispatch = createEventDispatcher();

  // Linkerkolom in vaste volgorde; rechterkolom geschud.
  let lefts = [];
  let rights = [];
  let mapping = {}; // pairId (links) -> pairId (gekozen rechts)
  let selectedLeft = null;

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  onMount(() => {
    lefts = [...(question.pairs ?? [])];
    rights = shuffle(question.pairs ?? []);
  });

  $: chosenRightIds = new Set(Object.values(mapping));
  $: allMatched = lefts.length > 0 && Object.keys(mapping).length === lefts.length;

  function pickLeft(id) {
    if (submitted) return;
    selectedLeft = selectedLeft === id ? null : id;
  }

  function pickRight(rightPairId) {
    if (submitted || selectedLeft == null) return;
    // verwijder een eventuele eerdere koppeling naar dit rechter-item
    for (const k of Object.keys(mapping)) {
      if (mapping[k] === rightPairId) delete mapping[k];
    }
    mapping[selectedLeft] = rightPairId;
    mapping = { ...mapping };
    selectedLeft = null;
  }

  function rightLabelFor(leftPairId) {
    const rid = mapping[leftPairId];
    if (!rid) return null;
    return (question.pairs ?? []).find((p) => p.id === rid)?.right ?? null;
  }

  function submit() {
    if (submitted || !allMatched) return;
    submitted = true;
    dispatch('answer', { result: gradeMatchResult(question, mapping), answer: { ...mapping } });
  }

  // kleuren na inzending: was deze koppeling correct?
  function leftClass(leftPairId) {
    if (!submitted) {
      if (selectedLeft === leftPairId) return 'border-indigo-400 bg-indigo-500/20';
      if (mapping[leftPairId]) return 'border-slate-600 bg-slate-800';
      return 'border-slate-700 bg-slate-800 hover:border-slate-500';
    }
    return mapping[leftPairId] === leftPairId
      ? 'border-emerald-500 bg-emerald-500/15'
      : 'border-rose-500 bg-rose-500/15';
  }
</script>

<div class="space-y-3">
  <p class="text-sm text-slate-400">Tik links een item aan en koppel het aan rechts.</p>
  <div class="grid grid-cols-2 gap-3">
    <!-- Linkerkolom -->
    <div class="space-y-2">
      {#each lefts as p}
        <button
          type="button"
          class="w-full rounded-xl border px-3 py-3 text-left text-sm transition {leftClass(p.id)}"
          on:click={() => pickLeft(p.id)}
          disabled={submitted}
        >
          <span class="text-slate-100">{p.left}</span>
          {#if rightLabelFor(p.id)}
            <span class="mt-1 block text-xs font-medium text-indigo-300">→ {rightLabelFor(p.id)}</span>
          {/if}
          {#if submitted && mapping[p.id] !== p.id}
            <span class="mt-0.5 block text-xs text-emerald-300">✓ {p.right}</span>
          {/if}
        </button>
      {/each}
    </div>
    <!-- Rechterkolom (geschud) -->
    <div class="space-y-2">
      {#each rights as p}
        <button
          type="button"
          class="w-full rounded-xl border px-3 py-3 text-left text-sm transition {chosenRightIds.has(p.id)
            ? 'border-indigo-500/60 bg-indigo-500/10 text-slate-300'
            : 'border-slate-700 bg-slate-800 hover:border-slate-500 text-slate-100'} {selectedLeft != null && !submitted ? 'ring-1 ring-indigo-400/40' : ''}"
          on:click={() => pickRight(p.id)}
          disabled={submitted}
        >{p.right}</button>
      {/each}
    </div>
  </div>

  {#if !submitted}
    <button
      type="button"
      class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white enabled:hover:bg-indigo-500 disabled:opacity-40"
      on:click={submit}
      disabled={!allMatched}
    >Controleer</button>
  {/if}
</div>
