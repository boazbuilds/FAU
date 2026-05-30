<script>
  import { createEventDispatcher } from 'svelte';
  import { gradeMcq, gradeTrueFalse, gradeShort } from '../lib/grading.js';

  export let question;

  const dispatch = createEventDispatcher();

  let submitted = false;
  let selected = null; // mcq option id
  let tfValue = null; // boolean
  let shortText = '';
  let shortCorrect = null;
  let revealed = false; // open: modelantwoord getoond

  // Reset bij een nieuwe vraag.
  $: if (question) resetFor(question.id);
  let currentId = null;
  function resetFor(id) {
    if (id === currentId) return;
    currentId = id;
    submitted = false;
    selected = null;
    tfValue = null;
    shortText = '';
    shortCorrect = null;
    revealed = false;
  }

  $: correctSet = new Set(question?.correct ?? []);

  function submitMcq() {
    if (submitted || selected == null) return;
    submitted = true;
    dispatch('answer', { result: gradeMcq(question, [selected]) ? 'correct' : 'wrong' });
  }
  function submitTf(v) {
    if (submitted) return;
    tfValue = v;
    submitted = true;
    dispatch('answer', { result: gradeTrueFalse(question, v) ? 'correct' : 'wrong' });
  }
  function submitShort() {
    if (submitted || !shortText.trim()) return;
    submitted = true;
    shortCorrect = gradeShort(question, shortText);
    dispatch('answer', { result: shortCorrect ? 'correct' : 'wrong' });
  }
  function rateOpen(result) {
    if (submitted) return;
    submitted = true;
    dispatch('answer', { result });
  }

  function optionClass(id) {
    if (!submitted) return selected === id ? 'border-indigo-400 bg-indigo-500/20' : 'border-slate-700 bg-slate-800 hover:border-slate-500';
    if (correctSet.has(id)) return 'border-emerald-500 bg-emerald-500/20';
    if (selected === id) return 'border-rose-500 bg-rose-500/20';
    return 'border-slate-700 bg-slate-800 opacity-60';
  }
</script>

<div class="space-y-4">
  <h2 class="text-lg font-semibold leading-snug text-white">{question.prompt}</h2>

  {#if question.type === 'mcq'}
    <div class="space-y-2">
      {#each question.options as opt}
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition {optionClass(opt.id)}"
          on:click={() => { if (!submitted) selected = opt.id; }}
          disabled={submitted}
        >
          <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-500 text-xs font-bold uppercase">{opt.id}</span>
          <span class="text-slate-100">{opt.text}</span>
        </button>
      {/each}
    </div>
    {#if !submitted}
      <button
        type="button"
        class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white enabled:hover:bg-indigo-500 disabled:opacity-40"
        on:click={submitMcq}
        disabled={selected == null}
      >Controleer</button>
    {/if}

  {:else if question.type === 'truefalse'}
    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        class="rounded-xl border py-4 font-semibold transition {submitted ? (question.correct === true ? 'border-emerald-500 bg-emerald-500/20' : (tfValue === true ? 'border-rose-500 bg-rose-500/20' : 'border-slate-700 bg-slate-800 opacity-60')) : 'border-slate-700 bg-slate-800 hover:border-emerald-500'}"
        on:click={() => submitTf(true)}
        disabled={submitted}
      >✔ Waar</button>
      <button
        type="button"
        class="rounded-xl border py-4 font-semibold transition {submitted ? (question.correct === false ? 'border-emerald-500 bg-emerald-500/20' : (tfValue === false ? 'border-rose-500 bg-rose-500/20' : 'border-slate-700 bg-slate-800 opacity-60')) : 'border-slate-700 bg-slate-800 hover:border-rose-500'}"
        on:click={() => submitTf(false)}
        disabled={submitted}
      >✘ Onwaar</button>
    </div>

  {:else if question.type === 'short'}
    <form on:submit|preventDefault={submitShort} class="space-y-3">
      <input
        type="text"
        bind:value={shortText}
        placeholder="Typ je antwoord…"
        autocomplete="off"
        class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-400 {submitted ? (shortCorrect ? 'border-emerald-500' : 'border-rose-500') : ''}"
        disabled={submitted}
      />
      {#if !submitted}
        <button type="submit" class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white enabled:hover:bg-indigo-500 disabled:opacity-40" disabled={!shortText.trim()}>Controleer</button>
      {/if}
    </form>

  {:else if question.type === 'open'}
    <p class="text-sm text-slate-400">Bedenk je antwoord (eventueel hardop of op papier) en onthul daarna het modelantwoord.</p>
    {#if !revealed}
      <button type="button" class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500" on:click={() => (revealed = true)}>Toon modelantwoord</button>
    {:else}
      <div class="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">Modelantwoord</div>
        <p class="text-slate-100">{question.modelAnswer}</p>
        {#if question.keyPoints?.length}
          <ul class="mt-3 space-y-1 text-sm text-slate-300">
            {#each question.keyPoints as kp}
              <li class="flex gap-2"><span class="text-indigo-400">•</span><span>{kp}</span></li>
            {/each}
          </ul>
        {/if}
      </div>
      {#if !submitted}
        <div class="space-y-2">
          <div class="text-center text-sm text-slate-400">Hoe ging het?</div>
          <div class="grid grid-cols-3 gap-2">
            <button type="button" class="rounded-xl border border-emerald-600 bg-emerald-600/20 py-3 font-semibold text-emerald-300 hover:bg-emerald-600/30" on:click={() => rateOpen('correct')}>Wist ik ✅</button>
            <button type="button" class="rounded-xl border border-amber-600 bg-amber-600/20 py-3 font-semibold text-amber-300 hover:bg-amber-600/30" on:click={() => rateOpen('partial')}>Deels 🟡</button>
            <button type="button" class="rounded-xl border border-rose-600 bg-rose-600/20 py-3 font-semibold text-rose-300 hover:bg-rose-600/30" on:click={() => rateOpen('wrong')}>Niet ❌</button>
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>
