<script>
  import { get } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';
  import { go } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { questionById, topicById } from '../lib/content.js';
  import { buildBlitzSession } from '../lib/session.js';
  import { applyResult } from '../lib/srs.js';
  import { xpForAnswer } from '../lib/gamify.js';
  import { CONFIG } from '../config.js';
  import * as audio from '../lib/audio.js';
  import Question from '../components/Question.svelte';
  import MusicControl from '../components/MusicControl.svelte';

  const B = CONFIG.blitz;

  // 'intro' | 'playing' | 'feedback' | 'over'
  let stage = 'intro';
  let ids = [];
  let index = 0;
  let timeLeft = B.seconds;
  let score = 0;
  let answered = 0;
  let correctCount = 0;
  let combo = 0;
  let maxCombo = 0;
  let lastGain = 0; // punten van het laatste antwoord
  let lastResult = null;
  let sessionXp = 0;
  let qComp;
  let timer = null;

  $: q = questionById[ids[index]];
  $: topic = q ? topicById[q.topicId] : null;
  // Verwijzing: expliciet veld, anders afgeleid uit een St.*-tag.
  $: refLabel = q ? q.ref || stdFromTags(q.tags) : null;

  function stdFromTags(tags) {
    const t = (tags ?? []).find((x) => /^St\.?\s?\d/i.test(x));
    if (!t) return null;
    const num = t.replace(/^St\.?\s?/i, '');
    return 'Standaard ' + num;
  }

  function start() {
    ids = buildBlitzSession(get(srs));
    index = 0;
    timeLeft = B.seconds;
    score = 0;
    answered = 0;
    correctCount = 0;
    combo = 0;
    maxCombo = 0;
    sessionXp = 0;
    stage = 'playing';
    audio.unlock();
    timer = setInterval(tick, 1000);
  }

  function tick() {
    timeLeft -= 1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      end();
    }
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function onAnswer(e) {
    if (stage !== 'playing') return;
    const result = e.detail.result;
    lastResult = result;
    answered += 1;

    if (result === 'correct') {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      correctCount += 1;
      lastGain = B.pointsPerCorrect + Math.max(0, combo - 1) * B.comboStep;
      score += lastGain;
      timeLeft = Math.min(B.seconds, timeLeft + B.timeBonusSec); // tijd erbij
      audio.correct(combo);
      if (combo >= 3) audio.comboFlair(combo);
    } else {
      combo = 0;
      lastGain = 0;
      if (B.wrongPenaltySec) timeLeft = Math.max(0, timeLeft - B.wrongPenaltySec);
      if (result === 'partial') audio.partial();
      else audio.wrong();
    }

    // XP + SRS bijwerken (telt mee voor leren), net als een gewone sessie.
    const xp = xpForAnswer(result, q?.difficulty ?? 2);
    sessionXp += xp;
    srs.update((s) => {
      s.items = s.items ?? {};
      if (q) s.items[q.id] = applyResult(s.items[q.id], result);
      return s;
    });
    profile.update((p) => {
      p.xp += xp;
      p.totals.answered = (p.totals.answered ?? 0) + 1;
      p.today.answered = (p.today.answered ?? 0) + 1;
      p.today.xp = (p.today.xp ?? 0) + xp;
      if (p.week) p.week.xp = (p.week.xp ?? 0) + xp;
      if (result === 'correct') {
        p.totals.correct = (p.totals.correct ?? 0) + 1;
        p.today.correct = (p.today.correct ?? 0) + 1;
      }
      return p;
    });

    stage = 'feedback';
  }

  function nextQuestion() {
    if (timeLeft <= 0) { end(); return; }
    index += 1;
    if (index >= ids.length) { end(); return; } // pool op (zeldzaam)
    lastResult = null;
    stage = 'playing';
  }

  let isHighscore = false;
  function end() {
    if (stage === 'over') return;
    stopTimer();
    profile.update((p) => {
      p.blitz = p.blitz ?? { best: 0, lastScore: 0, plays: 0 };
      p.blitz.lastScore = score;
      p.blitz.plays = (p.blitz.plays ?? 0) + 1;
      isHighscore = score > (p.blitz.best ?? 0);
      if (isHighscore) p.blitz.best = score;
      p.today.sessions = (p.today.sessions ?? 0) + 1;
      p.totals.sessions = (p.totals.sessions ?? 0) + 1;
      return p;
    });
    if (isHighscore && score > 0) audio.fanfare();
    else audio.levelUp();
    stage = 'over';
  }

  function quit() {
    stopTimer();
    go('home');
  }

  onMount(() => audio.setTrack && audio.pickSession(false));
  onDestroy(stopTimer);

  $: pct = Math.max(0, Math.round((timeLeft / B.seconds) * 100));
  $: low = timeLeft <= 10;
</script>

{#if stage === 'intro'}
  <div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-4 px-6 text-center">
    <div class="animate-bob text-7xl">⚡</div>
    <div class="font-pixel text-[9px] uppercase tracking-wide neon-cyan glitch">Kennis-Blitz</div>
    <h1 class="font-pixel text-lg leading-relaxed text-white">{B.seconds} seconden</h1>
    <p class="mx-auto max-w-sm text-sm leading-relaxed text-slate-300">
      Beantwoord zoveel mogelijk kennisvragen goed tegen de klok. Elk goed antwoord geeft punten
      én <span class="text-cyan-300">+{B.timeBonusSec}s</span>. Combo's geven bonuspunten. Na elk
      antwoord zie je de wet/Standaard-verwijzing.
    </p>
    <div class="arcade-panel rounded-2xl p-4">
      <div class="font-pixel text-[8px] uppercase tracking-wide text-slate-400">Highscore</div>
      <div class="mt-1 font-pixel text-2xl neon-magenta">{$profile.blitz?.best ?? 0}</div>
    </div>
    <button class="btn-arcade mt-2 w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={start}>Start ▶</button>
    <button class="font-pixel text-[9px] uppercase text-slate-500 hover:text-white" on:click={quit}>Terug</button>
  </div>
{:else if stage === 'over'}
  <div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
    <div class="animate-pop text-6xl">{isHighscore ? '🏆' : '⚡'}</div>
    <h1 class="font-pixel text-base uppercase leading-relaxed {isHighscore ? 'neon-magenta' : 'neon-cyan'}">
      {isHighscore ? 'Nieuwe highscore!' : 'Tijd om!'}
    </h1>
    <div class="grid w-full grid-cols-2 gap-3">
      <div class="arcade-panel rounded-2xl p-4">
        <div class="font-pixel text-lg neon-cyan">{score}</div>
        <div class="mt-1.5 font-pixel text-[7px] uppercase tracking-wide text-slate-400">Punten</div>
      </div>
      <div class="arcade-panel rounded-2xl p-4">
        <div class="font-pixel text-lg text-amber-300">{correctCount}/{answered}</div>
        <div class="mt-1.5 font-pixel text-[7px] uppercase tracking-wide text-slate-400">Goed</div>
      </div>
    </div>
    <div class="flex w-full items-center justify-between rounded-xl border border-slate-700 px-4 py-2.5 text-xs">
      <span class="text-slate-400">Beste reeks</span><span class="font-pixel text-amber-300">🔥 {maxCombo}</span>
    </div>
    <div class="flex w-full items-center justify-between rounded-xl border border-slate-700 px-4 py-2.5 text-xs">
      <span class="text-slate-400">Highscore</span><span class="font-pixel neon-magenta">{$profile.blitz?.best ?? 0}</span>
    </div>
    <p class="text-xs text-slate-500">+{sessionXp} XP verdiend · je voortgang telt mee.</p>
    <div class="w-full space-y-2.5">
      <button class="btn-arcade w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={start}>Nog een ronde ▶</button>
      <button class="w-full rounded-xl border border-slate-700 py-3 font-pixel text-[10px] uppercase text-slate-300 hover:bg-slate-800" on:click={quit}>Terug naar pad</button>
    </div>
  </div>
{:else}
  <div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
    <header class="flex items-center gap-3 px-4 py-3">
      <button class="text-xl text-slate-400 hover:text-white" on:click={quit} aria-label="Sluiten">✕</button>
      <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div class="h-full rounded-full {low ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-400 to-indigo-500'} transition-all duration-1000 ease-linear" style="width:{pct}%"></div>
      </div>
      <span class="font-pixel text-sm {low ? 'animate-shake text-rose-400' : 'text-cyan-300'}">{timeLeft}s</span>
      <MusicControl showName={false} />
    </header>

    <div class="flex items-center justify-between px-4 pb-1">
      <span class="font-pixel text-[10px] neon-cyan">{score} pt</span>
      {#if combo >= 2}
        {#key combo}<span class="animate-burst font-pixel text-[10px] text-amber-300">🔥 {combo}×</span>{/key}
      {/if}
    </div>

    <main class="flex-1 px-4 pb-32 pt-1">
      {#if q}
        {#if topic}
          <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{topic.icon} {topic.title}</div>
        {/if}
        {#key q.id}
          <Question bind:this={qComp} question={q} on:answer={onAnswer} />
        {/key}
      {/if}
    </main>

    {#if stage === 'feedback' && q}
      <div
        class="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md animate-floatup border-t p-4
        {lastResult === 'correct' ? 'border-emerald-700 bg-emerald-950/95' : lastResult === 'partial' ? 'border-amber-700 bg-amber-950/95' : 'border-rose-800 bg-rose-950/95'}"
      >
        <div class="mb-1.5 flex items-center justify-between">
          <span class="font-pixel text-[11px] uppercase tracking-wide {lastResult === 'correct' ? 'text-emerald-300' : lastResult === 'partial' ? 'text-amber-300' : 'text-rose-300'}">
            {lastResult === 'correct' ? 'Goed!' : lastResult === 'partial' ? 'Deels' : 'Fout'}
          </span>
          {#if lastGain > 0}<span class="font-pixel text-[10px] text-cyan-300">+{lastGain} pt</span>{/if}
        </div>
        {#if refLabel}
          <p class="mb-1 font-pixel text-[10px] uppercase tracking-wide neon-cyan">📖 {refLabel}</p>
        {/if}
        <p class="text-sm leading-relaxed text-slate-200">{q.explanation}</p>
        <button class="btn-arcade mt-3 w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={nextQuestion}>Volgende ▶</button>
      </div>
    {/if}
  </div>
{/if}
