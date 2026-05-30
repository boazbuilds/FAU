<script>
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { activeSession, go } from '../stores/ui.js';
  import { srs } from '../stores/srsStore.js';
  import { settings } from '../stores/settings.js';
  import { buildSession, buildLessonSession, buildBossSession } from '../lib/session.js';
  import { starsFor } from '../lib/progress.js';
  import { topicById } from '../lib/content.js';
  import { CONFIG } from '../config.js';
  import { resultQuip, randomFrom, jokes, BOSS } from '../lib/humor.js';
  import * as audio from '../lib/audio.js';
  import Badge from '../components/Badge.svelte';
  import Mascot from '../components/Mascot.svelte';

  const summary = get(activeSession)?.summary ?? {
    answered: 0, correct: 0, score: 0, xpGained: 0, perfect: false, outOfHearts: false,
    mode: 'normal', maxCombo: 0, newBadges: [], pred: null, boss: null
  };
  const accuracy = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  const isLesson = summary.mode === 'lesson';
  const isBoss = summary.mode === 'boss';
  const bossPassed = isBoss && summary.boss?.passed;
  const stars = isLesson ? starsFor(summary.score) : 0;

  const celebrate = (summary.perfect || bossPassed) && !get(settings).reducedMotion;
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#22d3ee'];

  const heroEmoji = bossPassed ? '👑' : isBoss ? '😬' : summary.perfect ? '🏆' : summary.outOfHearts ? '💔' : '🎉';
  const title = bossPassed
    ? 'Boss verslagen!'
    : isBoss
      ? 'Boss niet gehaald'
      : isLesson
        ? 'Les afgerond!'
        : summary.outOfHearts
          ? 'Levens op'
          : 'Sessie klaar!';

  const unlockedTitle = summary.boss?.unlockedModuleId ? topicById[summary.boss.unlockedModuleId]?.title : null;

  // Mascotte: passende quip + een grap als beloning.
  const quip = resultQuip({ perfect: summary.perfect, isBoss, bossPassed, accuracy });
  const bossLine = isBoss ? randomFrom(bossPassed ? BOSS.win : BOSS.lose) : null;
  const rewardJoke = (summary.perfect || (!isBoss && accuracy >= 70) || bossPassed) ? randomFrom(jokes) : null;
  const mascotMood = bossPassed || summary.perfect ? 'cheer' : isBoss && !bossPassed ? 'oops' : accuracy >= 70 ? 'happy' : 'think';

  function againLesson() {
    if (summary.lessonId) {
      activeSession.set({ ids: buildLessonSession(summary.lessonId), mode: 'lesson', lessonId: summary.lessonId, moduleId: summary.moduleId });
      go('session');
    }
  }
  function retryBoss() {
    if (summary.moduleId) {
      activeSession.set({ ids: buildBossSession(summary.moduleId), mode: 'boss', moduleId: summary.moduleId });
      go('session');
    }
  }
  function againNormal() {
    const s = get(settings);
    activeSession.set({ ids: buildSession(get(srs), { length: s.sessionLength, newCount: s.newPerSession }), mode: 'normal' });
    go('session');
  }
  function home() {
    activeSession.set(null);
    go('home');
  }

  onMount(() => {
    if (bossPassed || summary.perfect) audio.fanfare();
    else if (summary.outOfHearts) audio.wrong();
    else audio.correct(0);
    if (summary.newBadges?.length) setTimeout(() => audio.levelUp(), 650);
  });
</script>

<div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
  <div class="animate-pop text-6xl">{heroEmoji}</div>
  <h1 class="font-pixel text-base uppercase leading-relaxed {summary.outOfHearts || (isBoss && !bossPassed) ? 'neon-magenta' : 'neon-cyan'}">{title}</h1>

  {#if isLesson}
    <div class="flex gap-2 text-4xl" aria-label="{stars} van 3 sterren">
      {#each Array(3) as _, i}<span class={i < stars ? 'text-amber-400' : 'text-slate-700'}>★</span>{/each}
    </div>
  {/if}

  <div class="grid w-full grid-cols-2 gap-3">
    <div class="arcade-panel rounded-2xl p-4">
      <div class="font-pixel text-lg neon-cyan">+{summary.xpGained}</div>
      <div class="mt-1.5 font-pixel text-[7px] uppercase tracking-wide text-slate-400">XP verdiend</div>
    </div>
    <div class="arcade-panel rounded-2xl p-4">
      <div class="font-pixel text-lg {bossPassed || (!isBoss && accuracy >= 80) ? 'text-emerald-300' : 'text-amber-300'}">{accuracy}%</div>
      <div class="mt-1.5 font-pixel text-[7px] uppercase tracking-wide text-slate-400">{summary.correct}/{summary.answered} goed</div>
    </div>
  </div>

  {#if summary.maxCombo >= 3}
    <div class="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 font-pixel text-[9px] uppercase text-amber-300">🔥 Reeks: {summary.maxCombo} op rij</div>
  {/if}

  <div class="w-full text-left">
    <Mascot mood={mascotMood} size="md">
      {quip}{#if rewardJoke}<span class="mt-2 block border-t border-slate-700 pt-2 text-slate-300">{rewardJoke}</span>{/if}
    </Mascot>
  </div>

  {#if isBoss}
    <div class="flex w-full items-start gap-3 rounded-2xl border p-3 text-left {bossPassed ? 'border-emerald-700/50 bg-emerald-950/20' : 'border-amber-700/40 bg-amber-950/20'}">
      <span class="text-3xl">{BOSS.emoji}</span>
      <div class="min-w-0">
        <div class="font-pixel text-[8px] uppercase tracking-wide text-amber-300/80">{BOSS.name} · {BOSS.role}</div>
        <p class="mt-1 text-sm italic leading-relaxed text-slate-200">{bossLine}</p>
      </div>
    </div>
    {#if bossPassed}
      <p class="text-sm text-emerald-300">Gehaald! {#if unlockedTitle}Module <span class="font-semibold">{unlockedTitle}</span> ontgrendeld. 🔓{/if}</p>
    {:else}
      <p class="text-sm text-rose-300">Je had {accuracy}% — je hebt {Math.round(CONFIG.path.bossPassRatio * 100)}% nodig. Oefen de lessen nog eens en versla Sjef.</p>
    {/if}
  {/if}

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

  <div class="w-full space-y-2.5">
    {#if isBoss && !bossPassed}
      <button class="btn-arcade w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={retryBoss}>Boss opnieuw ↻</button>
    {:else if isLesson}
      <button class="btn-arcade w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={againLesson}>Les herhalen ↻</button>
    {:else if !isBoss}
      <button class="btn-arcade w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={againNormal}>Nog een ronde ▶</button>
    {/if}
    <button class="w-full rounded-xl border border-slate-700 py-3 font-pixel text-[10px] uppercase text-slate-300 hover:bg-slate-800" on:click={home}>Terug naar pad</button>
  </div>
</div>

{#if celebrate}
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
