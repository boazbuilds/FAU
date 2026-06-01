<script>
  // ⏱️ DEADLINE: de leercurve-set (100 vragen) achter elkaar. Alle 100 voltooien
  // geeft gegarandeerd +1 punt op het geschatte instellingstoets-cijfer (eenmalig).
  // Telt mee voor XP/SRS; kost geen levens. Vroegtijdig stoppen = geen bonus.
  import { get } from 'svelte/store';
  import { go } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { questionById, topicById, tipById } from '../lib/content.js';
  import { buildDeadlineSession } from '../lib/session.js';
  import { applyResult } from '../lib/srs.js';
  import { xpForAnswer } from '../lib/gamify.js';
  import { estimateCijfer } from '../lib/predict.js';
  import { onMount } from 'svelte';
  import * as audio from '../lib/audio.js';
  import Question from '../components/Question.svelte';
  import MusicControl from '../components/MusicControl.svelte';

  let stage = 'intro'; // 'intro' | 'playing' | 'feedback' | 'done'
  let ids = [];
  let index = 0;
  let answered = 0;
  let correctCount = 0;
  let sessionXp = 0;
  let lastResult = null;
  let qComp;
  let gradeBefore = null;
  let gradeAfter = null;
  let earnedBonus = false;

  $: q = questionById[ids[index]];
  $: topic = q ? topicById[q.topicId] : null;
  $: tip = q?.tipRef ? tipById[q.tipRef] : null;
  $: total = ids.length;
  $: isLast = index + 1 >= total;
  $: pct = total ? Math.round(((index + (stage === 'feedback' ? 1 : 0)) / total) * 100) : 0;

  function start() {
    ids = buildDeadlineSession();
    index = 0;
    answered = 0;
    correctCount = 0;
    sessionXp = 0;
    stage = 'playing';
    audio.unlock();
  }

  function onAnswer(e) {
    if (stage !== 'playing') return;
    lastResult = e.detail.result;
    answered += 1;
    if (lastResult === 'correct') correctCount += 1;
    const xp = xpForAnswer(lastResult, q?.difficulty ?? 2);
    sessionXp += xp;
    srs.update((s) => {
      s.items = s.items ?? {};
      if (q) s.items[q.id] = applyResult(s.items[q.id], lastResult);
      return s;
    });
    profile.update((p) => {
      p.xp += xp;
      p.totals.answered = (p.totals.answered ?? 0) + 1;
      p.today.answered = (p.today.answered ?? 0) + 1;
      p.today.xp = (p.today.xp ?? 0) + xp;
      if (p.week) p.week.xp = (p.week.xp ?? 0) + xp;
      if (lastResult === 'correct') {
        p.totals.correct = (p.totals.correct ?? 0) + 1;
        p.today.correct = (p.today.correct ?? 0) + 1;
      }
      return p;
    });
    if (lastResult === 'correct') audio.correct(1);
    else if (lastResult === 'partial') audio.partial();
    else audio.wrong();
    stage = 'feedback';
  }

  function next() {
    if (isLast) { finish(); return; }
    index += 1;
    lastResult = null;
    stage = 'playing';
  }

  function finish() {
    gradeBefore = estimateCijfer(get(srs), get(profile));
    profile.update((p) => {
      p.today.sessions = (p.today.sessions ?? 0) + 1;
      p.totals.sessions = (p.totals.sessions ?? 0) + 1;
      earnedBonus = (p.deadlineBonus ?? 0) < 1; // alle 100 voltooid → eenmalig +1 punt
      p.deadlineBonus = Math.max(p.deadlineBonus ?? 0, 1);
      return p;
    });
    gradeAfter = estimateCijfer(get(srs), get(profile));
    audio.fanfare();
    stage = 'done';
  }

  function quit() {
    go('home');
  }

  onMount(() => audio.pickSession(true));
</script>

{#if stage === 'intro'}
  <div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-4 px-6 text-center">
    <div class="animate-bob text-7xl">🎯</div>
    <div class="font-pixel text-[9px] uppercase tracking-wide neon-magenta glitch">DEADLINE</div>
    <h1 class="font-pixel text-lg leading-relaxed text-white">100 vragen</h1>
    <p class="mx-auto max-w-sm text-sm leading-relaxed text-slate-300">
      Beantwoord <span class="text-fuchsia-300">alle 100</span> vragen van de leercurve achter
      elkaar. Voltooi je de hele set, dan krijg je <span class="text-fuchsia-300">+1 punt</span>
      op je geschatte instellingstoets-cijfer. Stoppen kan altijd, maar dan geen bonus.
    </p>
    <button class="btn-arcade btn-arcade-magenta mt-2 w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={start}>Start ▶</button>
    <button class="font-pixel text-[9px] uppercase text-slate-500 hover:text-white" on:click={quit}>Terug</button>
  </div>
{:else if stage === 'done'}
  <div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
    <div class="animate-pop text-6xl">🏆</div>
    <h1 class="font-pixel text-base uppercase leading-relaxed neon-magenta">DEADLINE gehaald!</h1>
    <div class="grid w-full grid-cols-2 gap-3">
      <div class="arcade-panel rounded-2xl p-4">
        <div class="font-pixel text-lg text-amber-300">{correctCount}/{answered}</div>
        <div class="mt-1.5 font-pixel text-[7px] uppercase tracking-wide text-slate-400">Goed</div>
      </div>
      <div class="arcade-panel rounded-2xl p-4">
        <div class="font-pixel text-lg neon-cyan">+{sessionXp}</div>
        <div class="mt-1.5 font-pixel text-[7px] uppercase tracking-wide text-slate-400">XP</div>
      </div>
    </div>
    <div class="arcade-panel w-full rounded-2xl p-5">
      <div class="font-pixel text-[8px] uppercase tracking-wide text-slate-400">Geschat cijfer</div>
      <div class="mt-1.5 font-pixel text-2xl neon-cyan">
        {gradeBefore?.cijfer?.toFixed(1)} → <span class="text-fuchsia-300">{gradeAfter?.cijfer?.toFixed(1)}</span>
      </div>
      <div class="mt-1 text-xs text-slate-400">{earnedBonus ? '+1 punt DEADLINE-bonus verdiend 🎉' : 'DEADLINE-bonus stond al op je naam'}</div>
    </div>
    <button class="btn-arcade w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={quit}>Terug naar modi</button>
  </div>
{:else}
  <div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
    <header class="flex items-center gap-3 px-4 py-3">
      <button class="text-xl text-slate-400 hover:text-white" on:click={quit} aria-label="Sluiten">✕</button>
      <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div class="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 transition-all duration-300" style="width:{pct}%"></div>
      </div>
      <span class="font-pixel text-[10px] text-fuchsia-300">{Math.min(index + 1, total)}/{total}</span>
      <MusicControl showName={false} />
    </header>

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
        <div class="mb-1.5 font-pixel text-[11px] uppercase tracking-wide {lastResult === 'correct' ? 'text-emerald-300' : lastResult === 'partial' ? 'text-amber-300' : 'text-rose-300'}">
          {lastResult === 'correct' ? 'Goed!' : lastResult === 'partial' ? 'Deels' : 'Fout'}
        </div>
        {#if q.ref}<p class="mb-1 font-pixel text-[10px] uppercase tracking-wide neon-cyan">📖 {q.ref}</p>{/if}
        <p class="text-sm leading-relaxed text-slate-200">{q.explanation}</p>
        {#if tip}
          <p class="mt-2 rounded-lg bg-slate-900/60 p-2 text-xs leading-relaxed text-indigo-200"><span class="font-semibold">💡 {tip.title}:</span> {tip.body}</p>
        {/if}
        <button class="btn-arcade mt-3 w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={next}>
          {isLast ? 'Afronden ■' : 'Volgende ▶'}
        </button>
      </div>
    {/if}
  </div>
{/if}
