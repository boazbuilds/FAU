<script>
  import { get } from 'svelte/store';
  import { go, activeSession } from '../stores/ui.js';
  import { srs } from '../stores/srsStore.js';
  import { questionById, topicById } from '../lib/content.js';

  // Vragen die recent (laatste poging) fout of deels gingen.
  $: mistakes = Object.entries($srs.items ?? {})
    .filter(([id, it]) => questionById[id] && (it.history ?? []).slice(-1)[0] < 1)
    .map(([id]) => questionById[id]);

  function practiceAll() {
    if (mistakes.length === 0) return;
    const ids = mistakes.map((q) => q.id);
    activeSession.set({ ids, mode: 'practice' });
    go('session');
  }
</script>

<div class="space-y-4 px-4 pb-28 pt-2">
  <div class="flex items-center gap-3">
    <button class="text-xl text-slate-400 hover:text-white" on:click={() => go('progress')} aria-label="Terug">←</button>
    <h1 class="text-2xl font-bold text-white">Mijn fouten</h1>
  </div>

  {#if mistakes.length === 0}
    <div class="mt-16 text-center text-slate-400">
      <p class="text-5xl">✅</p>
      <p class="mt-3">Geen openstaande fouten. Goed bezig!</p>
    </div>
  {:else}
    <p class="text-sm text-slate-400">{mistakes.length} {mistakes.length === 1 ? 'vraag' : 'vragen'} die je laatst niet (helemaal) goed had.</p>
    <button class="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500" on:click={practiceAll}>Heroefen deze ({mistakes.length})</button>
    <div class="space-y-2">
      {#each mistakes as q}
        {@const t = topicById[q.topicId]}
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t?.icon} {t?.title}</div>
          <p class="text-sm text-slate-200">{q.prompt}</p>
        </div>
      {/each}
    </div>
  {/if}
</div>
