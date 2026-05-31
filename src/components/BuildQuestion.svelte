<script>
  import { createEventDispatcher } from 'svelte';
  import { gradeBuildResult, buildScore, buildMaxPoints } from '../lib/grading.js';

  export let question;
  export let submitted = false;

  const dispatch = createEventDispatcher();

  // assignment = { [blockId]: slotId }. Niet-geplaatste blokken blijven in de pot.
  let assignment = {};
  let selectedBlock = null; // gekozen bouwsteen die je in een slot wilt zetten

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Eén keer schudden per vraag.
  let shuffledFor = null;
  let blocks = [];
  $: slots = question?.slots ?? [];
  $: if (question && shuffledFor !== question.id) {
    shuffledFor = question.id;
    blocks = shuffle(question.blocks ?? []);
    assignment = {};
    selectedBlock = null;
    submitted = false;
  }

  $: blockById = Object.fromEntries((question?.blocks ?? []).map((b) => [b.id, b]));
  $: pot = blocks.filter((b) => !(b.id in assignment)); // nog niet geplaatst
  $: placedCount = Object.keys(assignment).length;

  function pickBlock(id) {
    if (submitted) return;
    selectedBlock = selectedBlock === id ? null : id;
  }

  function dropInSlot(slotId) {
    if (submitted || selectedBlock == null) return;
    assignment[selectedBlock] = slotId;
    assignment = { ...assignment };
    selectedBlock = null;
  }

  function removeFromSlot(blockId) {
    if (submitted) return;
    delete assignment[blockId];
    assignment = { ...assignment };
  }

  function blocksInSlot(slotId) {
    return (question.blocks ?? []).filter((b) => assignment[b.id] === slotId);
  }

  function submit() {
    if (submitted) return;
    submitted = true;
    dispatch('answer', {
      result: gradeBuildResult(question, assignment),
      answer: { ...assignment },
      fraction: buildScore(question, assignment) // exacte score (voor boss-slagen)
    });
  }

  // Externe lock (timer-consistentie, net als de andere vraagtypes).
  export function lock() {
    submitted = true;
  }

  // --- Na inzenden: feedback per geplaatst blok ---
  function placedClass(b) {
    if (!submitted) return 'border-slate-600 bg-slate-800';
    if (b.role === 'kern') {
      return assignment[b.id] === b.slot
        ? 'border-emerald-500 bg-emerald-500/15'
        : 'border-amber-500 bg-amber-500/15'; // juist element, verkeerd slot
    }
    return 'border-rose-500 bg-rose-500/15'; // instinker/afleider hoort hier niet
  }
  $: scorePct = submitted ? Math.round(buildScore(question, assignment) * 100) : 0;
  $: gotPoints = submitted ? Math.round(buildScore(question, assignment) * buildMaxPoints(question)) : 0;
  // Gemiste kern-blokken (niet geplaatst).
  $: missed = submitted ? (question.blocks ?? []).filter((b) => b.role === 'kern' && !(b.id in assignment)) : [];
  // Verkeerd gekozen blokken (instinker/afleider) voor de leermomenten.
  $: badChosen = submitted ? (question.blocks ?? []).filter((b) => b.role !== 'kern' && b.id in assignment) : [];
</script>

<div class="space-y-4">
  <p class="text-sm text-slate-400">
    {#if submitted}Bekijk hieronder welke bouwstenen klopten.
    {:else if selectedBlock != null}Tik nu de stap waar deze bouwsteen hoort.
    {:else}Tik een bouwsteen, daarna de juiste stap. Laat afleiders in de pot.{/if}
  </p>

  <!-- Pot met losse bouwstenen -->
  {#if !submitted && pot.length}
    <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
      <div class="mb-2 font-pixel text-[8px] uppercase tracking-wide text-slate-500">Bouwstenen</div>
      <div class="flex flex-wrap gap-2">
        {#each pot as b (b.id)}
          <button
            type="button"
            class="rounded-xl border px-3 py-2 text-left text-sm transition {selectedBlock === b.id ? 'border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400/40' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}"
            on:click={() => pickBlock(b.id)}
          >{b.text}</button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Slots (structuurstappen) -->
  <div class="space-y-2">
    {#each slots as s (s.id)}
      <div
        class="rounded-2xl border p-3 {!submitted && selectedBlock != null ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-700 bg-slate-800/40'}"
        role="button"
        tabindex="0"
        on:click={() => dropInSlot(s.id)}
        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && dropInSlot(s.id)}
      >
        <div class="mb-1.5 font-pixel text-[8px] uppercase tracking-wide text-cyan-300/80">{s.label}</div>
        <div class="flex flex-wrap gap-2">
          {#each blocksInSlot(s.id) as b (b.id)}
            <button
              type="button"
              class="rounded-lg border px-2.5 py-1.5 text-left text-sm transition {placedClass(b)}"
              on:click|stopPropagation={() => removeFromSlot(b.id)}
              disabled={submitted}
            >{b.text}{#if submitted && b.role === 'kern' && assignment[b.id] !== b.slot}<span class="ml-1 text-[11px] text-amber-300">(verkeerde stap)</span>{/if}</button>
          {/each}
          {#if blocksInSlot(s.id).length === 0}
            <span class="text-xs italic text-slate-600">leeg</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if !submitted}
    <button
      type="button"
      class="btn-arcade w-full rounded-xl py-3 font-pixel text-xs uppercase"
      on:click={submit}
    >Controleer{placedCount ? '' : ' (niets geplaatst)'}</button>
  {:else}
    <!-- Score + leermomenten -->
    <div class="rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-sm">
      <div class="mb-2 font-pixel text-[10px] uppercase tracking-wide neon-cyan">
        {gotPoints} van de {buildMaxPoints(question)} punten · {scorePct}%
      </div>
      {#each badChosen as b (b.id)}
        <p class="mb-1 text-xs leading-relaxed text-rose-300">
          ✗ <span class="font-semibold">{b.text}</span>{#if b.explain} — {b.explain}{/if}
        </p>
      {/each}
      {#each missed as b (b.id)}
        <p class="mb-1 text-xs leading-relaxed text-amber-200/90">
          ⚠ Gemist: <span class="font-semibold">{b.text}</span>
        </p>
      {/each}
    </div>
  {/if}
</div>
