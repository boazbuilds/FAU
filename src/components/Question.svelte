<script>
  import { createEventDispatcher } from 'svelte';
  import { gradeMcq, gradeShort } from '../lib/grading.js';
  import MatchQuestion from './MatchQuestion.svelte';
  import BuildQuestion from './BuildQuestion.svelte';

  export let question;
  // Eén-klik-modus (Blitz): bij enkelvoudige mcq is de klik op een optie meteen
  // het antwoord — geen losse "Controleer"-stap. Geldt niet voor multi-select.
  export let instantMcq = false;

  const dispatch = createEventDispatcher();

  let submitted = false;
  let selected = null; // mcq (enkel) option id
  let multiSelected = new Set(); // mcq (multi)
  let shortText = '';
  let shortCorrect = null;
  let showContext = false;

  // Reset bij een nieuwe vraag.
  $: if (question) resetFor(question.id);
  let currentId = null;
  function resetFor(id) {
    if (id === currentId) return;
    currentId = id;
    submitted = false;
    selected = null;
    multiSelected = new Set();
    shortText = '';
    shortCorrect = null;
    showContext = false;
  }

  $: correctSet = new Set(question?.correct ?? []);
  $: isMulti = question?.type === 'mcq' && question?.multi;

  // Vergrendel de vraag van buitenaf (bv. als Sjefs klok afloopt): onthul + blokkeer.
  export function lock() {
    submitted = true;
  }

  function submitMcq() {
    if (submitted) return;
    const answer = isMulti ? [...multiSelected] : selected == null ? [] : [selected];
    if (answer.length === 0) return;
    submitted = true;
    dispatch('answer', { result: gradeMcq(question, answer) ? 'correct' : 'wrong', answer });
  }
  function pickMcq(id) {
    if (submitted) return;
    if (isMulti) { toggleMulti(id); return; }
    selected = id;
    if (instantMcq) submitMcq(); // één klik = antwoord (Blitz)
  }
  function toggleMulti(id) {
    if (submitted) return;
    if (multiSelected.has(id)) multiSelected.delete(id);
    else multiSelected.add(id);
    multiSelected = new Set(multiSelected);
  }
  function submitShort() {
    if (submitted || !shortText.trim()) return;
    submitted = true;
    shortCorrect = gradeShort(question, shortText);
    dispatch('answer', { result: shortCorrect ? 'correct' : 'wrong', answer: shortText });
  }
  function onMatch(e) {
    submitted = true;
    dispatch('answer', e.detail);
  }

  function optionClass(id) {
    const chosen = isMulti ? multiSelected.has(id) : selected === id;
    if (!submitted) return chosen ? 'border-indigo-400 bg-indigo-500/20' : 'border-slate-700 bg-slate-800 hover:border-slate-500';
    if (correctSet.has(id)) return 'border-emerald-500 bg-emerald-500/20';
    if (chosen) return 'border-rose-500 bg-rose-500/20';
    return 'border-slate-700 bg-slate-800 opacity-60';
  }
</script>

<div class="space-y-4">
  {#if question.context}
    <button
      type="button"
      class="w-full rounded-xl border border-slate-700/70 bg-slate-800/50 px-3 py-2 text-left text-xs text-slate-300"
      on:click={() => (showContext = !showContext)}
    >
      <span class="font-semibold text-slate-400">📄 Casus</span>
      {#if showContext}<span class="mt-1 block leading-relaxed">{question.context}</span>{:else}<span class="text-slate-500"> — tik om te tonen</span>{/if}
    </button>
  {/if}

  <h2 class="text-lg font-semibold leading-snug text-white">{question.prompt}</h2>

  {#if question.type === 'mcq'}
    {#if isMulti}<p class="-mt-2 text-xs text-slate-400">Meerdere antwoorden mogelijk.</p>{/if}
    <div class="space-y-2">
      {#each question.options as opt}
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition {optionClass(opt.id)}"
          on:click={() => pickMcq(opt.id)}
          disabled={submitted}
          aria-pressed={isMulti ? multiSelected.has(opt.id) : selected === opt.id}
        >
          <span class="grid h-6 w-6 shrink-0 place-items-center rounded-{isMulti ? 'md' : 'full'} border border-slate-500 text-xs font-bold uppercase">
            {isMulti ? (multiSelected.has(opt.id) ? '✓' : '') : opt.id}
          </span>
          <span class="text-slate-100">{opt.text}</span>
        </button>
      {/each}
    </div>
    {#if !submitted && !(instantMcq && !isMulti)}
      <button
        type="button"
        class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white enabled:hover:bg-indigo-500 disabled:opacity-40"
        on:click={submitMcq}
        disabled={isMulti ? multiSelected.size === 0 : selected == null}
      >Controleer</button>
    {/if}

  {:else if question.type === 'truefalse'}
    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        class="rounded-xl border py-4 font-semibold transition {submitted ? (question.correct === true ? 'border-emerald-500 bg-emerald-500/20' : (selected === true ? 'border-rose-500 bg-rose-500/20' : 'border-slate-700 bg-slate-800 opacity-60')) : 'border-slate-700 bg-slate-800 hover:border-emerald-500'}"
        on:click={() => { if (!submitted) { selected = true; submitted = true; dispatch('answer', { result: question.correct === true ? 'correct' : 'wrong', answer: true }); } }}
        disabled={submitted}
      >✔ Waar</button>
      <button
        type="button"
        class="rounded-xl border py-4 font-semibold transition {submitted ? (question.correct === false ? 'border-emerald-500 bg-emerald-500/20' : (selected === false ? 'border-rose-500 bg-rose-500/20' : 'border-slate-700 bg-slate-800 opacity-60')) : 'border-slate-700 bg-slate-800 hover:border-rose-500'}"
        on:click={() => { if (!submitted) { selected = false; submitted = true; dispatch('answer', { result: question.correct === false ? 'correct' : 'wrong', answer: false }); } }}
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

  {:else if question.type === 'match'}
    {#key question.id}
      <MatchQuestion {question} on:answer={onMatch} />
    {/key}

  {:else if question.type === 'build'}
    {#key question.id}
      <BuildQuestion {question} on:answer={onMatch} />
    {/key}

  {:else if question.type === 'open'}
    <p class="text-sm text-slate-400">Bedenk je antwoord en onthul daarna het modelantwoord.</p>
    {#if !submitted}
      <button type="button" class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500" on:click={() => { submitted = true; }}>Toon modelantwoord</button>
    {:else}
      <div class="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
        <p class="text-slate-100">{question.modelAnswer}</p>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button type="button" class="rounded-xl border border-emerald-600 bg-emerald-600/20 py-3 font-semibold text-emerald-300" on:click={() => dispatch('answer', { result: 'correct' })}>Wist ik ✅</button>
        <button type="button" class="rounded-xl border border-amber-600 bg-amber-600/20 py-3 font-semibold text-amber-300" on:click={() => dispatch('answer', { result: 'partial' })}>Deels 🟡</button>
        <button type="button" class="rounded-xl border border-rose-600 bg-rose-600/20 py-3 font-semibold text-rose-300" on:click={() => dispatch('answer', { result: 'wrong' })}>Niet ❌</button>
      </div>
    {/if}
  {/if}
</div>
