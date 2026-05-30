<script>
  import { get } from 'svelte/store';
  import { srs } from '../stores/srsStore.js';
  import { settings } from '../stores/settings.js';
  import { activeSession, go } from '../stores/ui.js';
  import { predict } from '../lib/predict.js';
  import { buildPracticeSession } from '../lib/session.js';
  import ProgressRing from '../components/ProgressRing.svelte';

  $: pred = predict($srs);
  $: pct = Math.round(pred.pPass / 0.05) * 5;
  $: bandLow = Math.round(pred.band[0] * 100);
  $: bandHigh = Math.round(pred.band[1] * 100);
  $: ringColor = pred.pPass >= 0.7 ? '#10b981' : pred.pPass >= 0.5 ? '#f59e0b' : '#ef4444';

  function practiceTopic(id) {
    const ids = buildPracticeSession(get(srs), id, get(settings).sessionLength);
    activeSession.set({ ids, mode: 'practice' });
    go('session');
  }
</script>

<div class="space-y-6 px-4 pb-28 pt-2">
  <h1 class="text-2xl font-bold text-white">Ga ik slagen? 🔮</h1>

  <div class="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
    {#if pred.enoughData}
      <ProgressRing value={pred.pPass} size={170} stroke={14} color={ringColor} label={`${pct}%`} sublabel="slagingskans" />
      <div class="text-center text-sm text-slate-400">Onzekerheidsmarge: {bandLow}%–{bandHigh}%</div>
      <div class="text-center text-xs text-slate-500">Een schatting op basis van je oefenresultaten — geen garantie.</div>
    {:else}
      <ProgressRing value={0} size={170} stroke={14} color="#64748b" label="—" sublabel="te weinig data" />
      <div class="text-center text-sm text-slate-400">Beantwoord nog wat meer vragen, dan verschijnt hier een betrouwbare schatting.</div>
    {/if}
  </div>

  <div class="space-y-3">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Oefen dit als eerste</h2>
    {#each pred.weakest as w}
      <button class="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left hover:border-indigo-600" on:click={() => practiceTopic(w.id)}>
        <div>
          <div class="font-medium text-white">{w.icon} {w.title}</div>
          <div class="text-xs text-slate-500">beheersing {Math.round(w.mastery * 100)}% · gezien {Math.round(w.coverage * 100)}%</div>
        </div>
        <span class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">Oefen</span>
      </button>
    {/each}
  </div>

  <p class="text-xs leading-relaxed text-slate-500">
    De schatting combineert per onderwerp je recente accuratesse, hoe goed je de stof onthoudt (spaced repetition) en hoeveel van de stof je al hebt gezien, gewogen naar het belang voor het tentamen.
  </p>
</div>
