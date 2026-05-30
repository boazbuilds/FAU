<script>
  import { get } from 'svelte/store';
  import { go, activeSession } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { settings } from '../stores/settings.js';
  import { buildSession, buildPracticeSession, dueCount } from '../lib/session.js';
  import { predict } from '../lib/predict.js';
  import { levelProgress, leagueFromLevel } from '../lib/gamify.js';
  import ProgressRing from '../components/ProgressRing.svelte';

  $: goalPct = $profile.dailyGoalXp ? Math.min(1, ($profile.today.xp ?? 0) / $profile.dailyGoalXp) : 0;
  $: due = dueCount($srs);
  $: pred = predict($srs);
  $: lp = levelProgress($profile.xp);
  $: league = leagueFromLevel(lp.level);
  $: noHearts = $settings.heartsEnabled && $profile.hearts <= 0;

  function start() {
    const s = get(settings);
    const ids = buildSession(get(srs), { length: s.sessionLength, newCount: s.newPerSession });
    activeSession.set({ ids, mode: 'normal' });
    go('session');
  }
  function practice() {
    const ids = buildPracticeSession(get(srs), null, get(settings).sessionLength);
    activeSession.set({ ids, mode: 'practice' });
    go('session');
  }

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Goedenacht' : hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
</script>

<div class="space-y-5 px-4 pb-28 pt-2">
  <div>
    <h1 class="text-2xl font-bold text-white">{greeting} 👋</h1>
    <p class="text-sm text-slate-400">Klaar voor een korte ronde Financial Auditing?</p>
  </div>

  <div class="flex items-center gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <ProgressRing value={goalPct} label={`${$profile.today.xp ?? 0}`} sublabel={`/ ${$profile.dailyGoalXp} XP`} />
    <div class="flex-1">
      <div class="text-sm text-slate-400">Dagdoel</div>
      <div class="text-lg font-semibold text-white">{goalPct >= 1 ? 'Gehaald! 🎉' : 'Vandaag oefenen'}</div>
      <div class="mt-1 flex items-center gap-2 text-sm text-amber-400"><span>🔥</span> {$profile.streak.current} dagen streak</div>
      <div class="text-xs text-slate-500">{league.label} · niveau {lp.level}</div>
    </div>
  </div>

  {#if noHearts}
    <div class="rounded-2xl border border-rose-800 bg-rose-950/50 p-4 text-center">
      <p class="font-semibold text-rose-200">Geen levens meer 💔</p>
      <p class="mt-1 text-sm text-slate-300">Ze groeien vanzelf weer aan — of doe een oefenronde om te herstellen.</p>
      <button class="mt-3 w-full rounded-xl bg-rose-600 py-3 font-bold text-white hover:bg-rose-500" on:click={practice}>Oefenen om te herstellen</button>
    </div>
  {:else}
    <div class="space-y-2">
      <button class="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-500" on:click={start}>
        Start sessie
      </button>
      <div class="text-center text-xs text-slate-500">{due > 0 ? `${due} vragen te herhalen vandaag` : 'Geen herhalingen open — je leert nieuwe stof'}</div>
      <button class="w-full rounded-xl border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800" on:click={practice}>Vrij oefenen (geen levens)</button>
    </div>
  {/if}

  <button class="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left hover:border-slate-700" on:click={() => go('predict')}>
    <div>
      <div class="text-sm text-slate-400">Geschatte slagingskans</div>
      <div class="text-2xl font-bold text-white">{pred.enoughData ? `${Math.round(pred.pPass / 0.05) * 5}%` : '—'}</div>
      <div class="text-xs text-slate-500">{pred.enoughData ? 'schatting, geen garantie' : 'oefen meer voor een schatting'}</div>
    </div>
    <div class="text-3xl">🔮</div>
  </button>
</div>
