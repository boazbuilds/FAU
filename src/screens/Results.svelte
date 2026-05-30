<script>
  import { get } from 'svelte/store';
  import { activeSession, go } from '../stores/ui.js';
  import { srs } from '../stores/srsStore.js';
  import { settings } from '../stores/settings.js';
  import { buildSession } from '../lib/session.js';
  import Badge from '../components/Badge.svelte';

  const summary = get(activeSession)?.summary ?? {
    answered: 0, correct: 0, xpGained: 0, perfect: false, outOfHearts: false, isPractice: false, newBadges: [], pred: null
  };
  const accuracy = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  const showConfetti = summary.perfect && !get(settings).reducedMotion;
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#22d3ee'];

  function again() {
    const s = get(settings);
    const ids = buildSession(get(srs), { length: s.sessionLength, newCount: s.newPerSession });
    activeSession.set({ ids, mode: 'normal' });
    go('session');
  }
  function home() {
    activeSession.set(null);
    go('home');
  }
</script>

<div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
  <div class="animate-pop text-6xl">{summary.perfect ? '🏆' : summary.outOfHearts ? '💔' : '🎉'}</div>
  <h1 class="text-2xl font-bold text-white">
    {summary.perfect ? 'Vlekkeloze sessie!' : summary.outOfHearts ? 'Levens op' : summary.isPractice ? 'Lekker geoefend!' : 'Sessie klaar!'}
  </h1>

  <div class="grid w-full grid-cols-2 gap-3">
    <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div class="text-3xl font-bold text-indigo-300">+{summary.xpGained}</div>
      <div class="text-xs text-slate-400">XP verdiend</div>
    </div>
    <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div class="text-3xl font-bold text-emerald-300">{accuracy}%</div>
      <div class="text-xs text-slate-400">{summary.correct}/{summary.answered} goed</div>
    </div>
  </div>

  {#if summary.outOfHearts}
    <p class="text-sm text-slate-400">Je levens groeien vanzelf weer aan. Vrij oefenen kan altijd zonder levens.</p>
  {/if}

  {#if summary.newBadges?.length}
    <div class="w-full rounded-2xl border border-amber-700/50 bg-amber-950/30 p-4">
      <div class="mb-3 text-sm font-semibold text-amber-200">Nieuwe badge{summary.newBadges.length > 1 ? 's' : ''}! 🏅</div>
      <div class="flex flex-wrap justify-center gap-4">
        {#each summary.newBadges as b}<Badge achievement={b} size="lg" />{/each}
      </div>
    </div>
  {/if}

  {#if summary.pred?.enoughData}
    <div class="text-sm text-slate-400">Slagingskans nu: <span class="font-semibold text-white">{Math.round(summary.pred.pPass / 0.05) * 5}%</span></div>
  {/if}

  <div class="w-full space-y-2">
    <button class="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500" on:click={again}>Nog een ronde</button>
    <button class="w-full rounded-xl border border-slate-700 py-3 font-semibold text-slate-200 hover:bg-slate-800" on:click={home}>Klaar voor nu</button>
  </div>
</div>

{#if showConfetti}
  <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
    {#each Array.from({ length: 40 }) as _, i}
      <span class="confetti" style="left:{Math.random() * 100}%; animation-delay:{Math.random() * 0.6}s; background:{colors[i % colors.length]}"></span>
    {/each}
  </div>
{/if}

<style>
  .confetti {
    position: absolute;
    top: -12px;
    width: 8px;
    height: 14px;
    border-radius: 2px;
    animation: fall 1.8s linear forwards;
  }
  @keyframes fall {
    to {
      transform: translateY(110vh) rotate(540deg);
      opacity: 0.15;
    }
  }
</style>
