<script>
  import { createEventDispatcher } from 'svelte';
  import { gradeMatchResult } from '../lib/grading.js';
  import { shuffle } from '../lib/shuffle.js';

  export let question;
  let submitted = false; // interne staat; res/set per vraag

  const dispatch = createEventDispatcher();

  let mapping = {}; // pairId (links) -> pairId (gekozen rechts)
  let selectedLeft = null;

  // Reactief afgeleid (rendert meteen). Eén keer schudden per vraag.
  $: lefts = question?.pairs ?? [];
  let shuffledFor = null;
  let rights = [];
  $: if (question && shuffledFor !== question.id) {
    shuffledFor = question.id;
    rights = shuffle(question.pairs ?? []);
    mapping = {};
    selectedLeft = null;
    submitted = false;
  }

  $: chosenRightIds = new Set(Object.values(mapping));
  $: allMatched = lefts.length > 0 && Object.keys(mapping).length === lefts.length;

  // Volgnummer van de koppeling (voor het kleur-badge dat links↔rechts verbindt).
  $: leftOrder = Object.fromEntries(lefts.map((p, i) => [p.id, i + 1]));
  function rightOrder(rightPairId) {
    const leftId = Object.keys(mapping).find((k) => mapping[k] === rightPairId);
    return leftId ? leftOrder[leftId] : null;
  }
  const badgeColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#22d3ee', '#a855f7'];

  function pickLeft(id) {
    if (submitted) return;
    selectedLeft = selectedLeft === id ? null : id;
  }

  function pickRight(rightPairId) {
    if (submitted) return;
    if (selectedLeft == null) {
      // niets links geselecteerd: als dit rechter-item al gekoppeld is, maak los
      for (const k of Object.keys(mapping)) {
        if (mapping[k] === rightPairId) delete mapping[k];
      }
      mapping = { ...mapping };
      return;
    }
    // verwijder eerdere koppeling naar dit rechter-item
    for (const k of Object.keys(mapping)) {
      if (mapping[k] === rightPairId) delete mapping[k];
    }
    mapping[selectedLeft] = rightPairId;
    mapping = { ...mapping };
    selectedLeft = null;
  }

  function submit() {
    if (submitted || !allMatched) return;
    submitted = true;
    dispatch('answer', { result: gradeMatchResult(question, mapping), answer: { ...mapping } });
  }

  function correctRightFor(leftPairId) {
    return (question.pairs ?? []).find((p) => p.id === leftPairId)?.right ?? '';
  }

  function leftClass(leftPairId) {
    if (!submitted) {
      if (selectedLeft === leftPairId) return 'border-indigo-400 bg-indigo-500/25 ring-2 ring-indigo-400/50';
      if (mapping[leftPairId]) return 'border-slate-500 bg-slate-800';
      return 'border-slate-700 bg-slate-800 hover:border-slate-500';
    }
    return mapping[leftPairId] === leftPairId
      ? 'border-emerald-500 bg-emerald-500/15'
      : 'border-rose-500 bg-rose-500/15';
  }
  function rightClass(rightPairId) {
    if (submitted) return 'border-slate-700 bg-slate-800 opacity-80';
    if (chosenRightIds.has(rightPairId)) return 'border-slate-500 bg-slate-800';
    if (selectedLeft != null) return 'border-indigo-500/50 bg-slate-800 hover:border-indigo-400';
    return 'border-slate-700 bg-slate-800 hover:border-slate-500';
  }
</script>

<div class="space-y-3">
  <p class="text-sm text-slate-400">
    {#if submitted}Bekijk hieronder welke koppelingen goed waren.
    {:else if selectedLeft != null}Tik nu rechts het item dat erbij hoort.
    {:else}Tik links een item aan, daarna rechts de match.{/if}
  </p>
  <div class="grid grid-cols-2 gap-3">
    <!-- Linkerkolom -->
    <div class="space-y-2">
      {#each lefts as p (p.id)}
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition {leftClass(p.id)}"
          on:click={() => pickLeft(p.id)}
          disabled={submitted}
        >
          {#if mapping[p.id]}
            <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style="background:{badgeColors[(leftOrder[p.id] - 1) % badgeColors.length]}">{leftOrder[p.id]}</span>
          {/if}
          <span class="min-w-0 flex-1">
            <span class="text-slate-100">{p.left}</span>
            {#if submitted && mapping[p.id] !== p.id}
              <span class="mt-0.5 block text-xs text-emerald-300">✓ {correctRightFor(p.id)}</span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
    <!-- Rechterkolom (geschud) -->
    <div class="space-y-2">
      {#each rights as p (p.id)}
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition {rightClass(p.id)}"
          on:click={() => pickRight(p.id)}
          disabled={submitted}
        >
          {#if rightOrder(p.id)}
            <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style="background:{badgeColors[(rightOrder(p.id) - 1) % badgeColors.length]}">{rightOrder(p.id)}</span>
          {/if}
          <span class="text-slate-100">{p.right}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if !submitted}
    <button
      type="button"
      class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white enabled:hover:bg-indigo-500 disabled:opacity-40"
      on:click={submit}
      disabled={!allMatched}
    >Controleer{allMatched ? '' : ` (${Object.keys(mapping).length}/${lefts.length})`}</button>
  {/if}
</div>
