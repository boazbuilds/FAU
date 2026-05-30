<script>
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { activeSession, go } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { progress } from '../stores/progressStore.js';
  import { settings } from '../stores/settings.js';
  import { questionById, topicById, lessonById, modules, tipById } from '../lib/content.js';
  import { applyResult } from '../lib/srs.js';
  import { xpForAnswer, registerGoalProgress, evaluateAchievements } from '../lib/gamify.js';
  import { predict } from '../lib/predict.js';
  import { completeLesson, recordBoss } from '../lib/progress.js';
  import { CONFIG } from '../config.js';
  import { praiseFor, comboMessage } from '../lib/humor.js';
  import * as audio from '../lib/audio.js';
  import Question from '../components/Question.svelte';
  import MusicControl from '../components/MusicControl.svelte';

  const sess = get(activeSession) ?? { ids: [], mode: 'normal' };
  const ids = sess.ids ?? [];
  const mode = sess.mode ?? 'normal';
  const lessonId = sess.lessonId ?? null;
  const moduleId = sess.moduleId ?? null;
  const isPractice = mode === 'practice';
  const isBoss = mode === 'boss';
  const isLesson = mode === 'lesson';

  const lesson = lessonId ? lessonById[lessonId] : null;
  let showIntro = !!lesson?.casusIntro;

  let index = 0;
  let phase = 'question'; // 'question' | 'feedback'
  let results = [];
  let sessionXp = 0;
  let lastResult = null;
  let outOfHearts = false;
  let combo = 0;
  let maxCombo = 0;
  let comboMsg = null;
  let feedbackHead = '';

  // Kies een (willekeurig) energiek nummer voor deze sessie; boss = intens.
  onMount(() => audio.pickSession(isBoss));

  $: q = questionById[ids[index]];
  $: topic = q ? topicById[q.topicId] : null;
  $: tip = q?.tipRef ? tipById[q.tipRef] : null;
  $: progressPct = ids.length ? (index + (phase === 'feedback' ? 1 : 0)) / ids.length : 0;
  $: isLast = index + 1 >= ids.length;

  function heartsActive() {
    // mild: oefenen én boss kosten geen levens
    return mode !== 'practice' && mode !== 'boss' && get(settings).heartsEnabled;
  }

  function onAnswer(e) {
    const result = e.detail.result;
    lastResult = result;
    results = [...results, { id: q.id, result }];

    // Combo (Duolingo-stijl): opbouwen bij goed, breken bij fout, gelijk bij deels.
    if (result === 'correct') {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
    } else if (result === 'wrong') {
      combo = 0;
    }
    comboMsg = result === 'correct' ? comboMessage(combo) : null;
    feedbackHead = praiseFor(result);

    // Bevredigende arcade-feedback.
    if (result === 'correct') {
      audio.correct(combo);
      if (comboMsg) audio.comboFlair(combo);
    } else if (result === 'partial') {
      audio.partial();
    } else {
      audio.wrong();
    }
    const gained = xpForAnswer(result, q.difficulty);
    sessionXp += gained;

    srs.update((s) => {
      s.items = s.items ?? {};
      s.items[q.id] = applyResult(s.items[q.id], result);
      return s;
    });

    profile.update((p) => {
      p.xp += gained;
      p.totals.answered = (p.totals.answered ?? 0) + 1;
      p.today.answered = (p.today.answered ?? 0) + 1;
      p.today.xp = (p.today.xp ?? 0) + gained;
      if (p.week) p.week.xp = (p.week.xp ?? 0) + gained;
      if (result === 'correct') {
        p.totals.correct = (p.totals.correct ?? 0) + 1;
        p.today.correct = (p.today.correct ?? 0) + 1;
      }
      if (heartsActive() && q.type !== 'open' && result === 'wrong') {
        p.hearts = Math.max(0, p.hearts - 1);
        if (p.hearts === 0) outOfHearts = true;
      }
      return p;
    });

    phase = 'feedback';
  }

  function next() {
    if (outOfHearts || isLast) {
      finish();
      return;
    }
    index += 1;
    phase = 'question';
    lastResult = null;
  }

  function finish() {
    const answered = results.length;
    const correct = results.filter((r) => r.result === 'correct').length;
    const score = answered ? correct / answered : 0;
    const perfect = answered > 0 && !outOfHearts && results.every((r) => r.result === 'correct');

    let bonus = 0;
    let bossResult = null;

    // Voortgang wegschrijven voor les/boss
    if (isLesson && lessonId) {
      progress.update((pr) => completeLesson(pr, lessonId, score, undefined));
    } else if (isBoss && moduleId) {
      progress.update((pr) => {
        bossResult = recordBoss(pr, modules, moduleId, score, undefined);
        return pr;
      });
    }

    profile.update((p) => {
      const firstToday = (p.today.sessions ?? 0) === 0;
      p.today.sessions = (p.today.sessions ?? 0) + 1;
      p.totals.sessions = (p.totals.sessions ?? 0) + 1;
      if (!isPractice) {
        if (perfect) bonus += CONFIG.perfectSessionBonus;
        if (firstToday) bonus += CONFIG.firstSessionOfDayBonus;
        if (isBoss && bossResult?.passed) bonus += CONFIG.path.bossBonusXp;
        p.xp += bonus;
        p.today.xp += bonus;
        if (p.week) p.week.xp = (p.week.xp ?? 0) + bonus;
        registerGoalProgress(p);
      } else {
        p.hearts = CONFIG.maxHearts; // oefenen herstelt levens
        p.heartsUpdatedAt = Date.now();
      }
      return p;
    });
    sessionXp += bonus;

    const pred = predict(get(srs));
    let newBadges = [];
    profile.update((p) => {
      newBadges = evaluateAchievements(p, {
        predictResult: pred,
        perfectSession: perfect,
        bossPassed: isBoss && bossResult?.passed,
        bossPerfect: isBoss && bossResult?.passed && perfect
      });
      return p;
    });

    activeSession.set({
      summary: {
        answered, correct, score, xpGained: sessionXp, perfect, outOfHearts,
        mode, lessonId, moduleId, maxCombo,
        boss: bossResult,
        newBadges, pred
      }
    });
    go('results');
  }

  function quit() {
    activeSession.set(null);
    go('home');
  }

  const headerLabel = isBoss ? '👑 Boss' : isPractice ? 'oefenen' : lesson ? lesson.title : '';
</script>

{#if showIntro}
  <div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-4 px-6">
    <div class="font-pixel text-[9px] uppercase tracking-wide neon-magenta">📄 Casus</div>
    <h1 class="font-pixel text-base leading-relaxed text-white">{lesson.title}</h1>
    <p class="text-sm leading-relaxed text-slate-200">{lesson.casusIntro}</p>
    <button class="btn-arcade mt-2 w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={() => (showIntro = false)}>Begin ▶</button>
    <button class="font-pixel text-[9px] uppercase text-slate-500 hover:text-white" on:click={quit}>Annuleren</button>
  </div>
{:else}
<div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
  <header class="flex items-center gap-3 px-4 py-3">
    <button class="text-xl text-slate-400 hover:text-white" on:click={quit} aria-label="Sluiten">✕</button>
    <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
      <div class="h-full rounded-full {isBoss ? 'bg-amber-500' : 'bg-indigo-500'} transition-all duration-300" style="width:{Math.round(progressPct * 100)}%"></div>
    </div>
    {#if heartsActive()}
      <div class="flex items-center gap-1 text-rose-400"><span>❤️</span><span class="font-pixel text-[10px] text-rose-300">{$profile.hearts}</span></div>
    {:else}
      <div class="font-pixel text-[8px] uppercase text-slate-500">{isBoss ? 'boss' : 'oefen'}</div>
    {/if}
    <MusicControl showName={false} />
  </header>

  <main class="flex-1 px-4 pb-32 pt-2">
    {#if !q}
      <div class="mt-20 text-center text-slate-300">
        <p class="text-5xl">📭</p>
        <p class="mt-3">Geen vragen beschikbaar.</p>
        <button class="mt-4 rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white" on:click={quit}>Terug</button>
      </div>
    {:else}
      <div class="mb-3 flex items-center justify-between gap-2">
        {#if topic}
          <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">{topic.icon} {topic.title}{headerLabel && !isLesson ? ` · ${headerLabel}` : ''}</div>
        {:else}<span></span>{/if}
        {#if combo >= 2}
          {#key combo}
            <span class="inline-flex shrink-0 animate-burst items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">🔥 {combo} op rij</span>
          {/key}
        {/if}
      </div>
      {#key q.id}
        <Question question={q} on:answer={onAnswer} />
      {/key}
    {/if}
  </main>

  {#if phase === 'feedback' && q}
    <div
      class="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md animate-floatup border-t p-4
      {lastResult === 'correct'
        ? 'border-emerald-700 bg-emerald-950/95'
        : lastResult === 'partial'
          ? 'border-amber-700 bg-amber-950/95'
          : 'border-rose-800 bg-rose-950/95'}"
    >
      <div
        class="mb-1.5 font-pixel text-[11px] uppercase tracking-wide
        {lastResult === 'correct' ? 'text-emerald-300' : lastResult === 'partial' ? 'text-amber-300' : 'text-rose-300 animate-shake'}"
      >
        {feedbackHead}
      </div>
      {#if comboMsg}
        <div class="mb-2 animate-burst rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-bold text-amber-300">🔥 {comboMsg}</div>
      {/if}
      {#if q.type === 'short'}
        <div class="mb-1 text-sm text-slate-200">Geaccepteerd antwoord: <span class="font-semibold">{q.answer.accept[0]}</span></div>
      {/if}
      <p class="text-sm leading-relaxed text-slate-200">{q.explanation}</p>
      {#if tip}
        <p class="mt-2 rounded-lg bg-slate-900/60 p-2 text-xs leading-relaxed text-indigo-200"><span class="font-semibold">💡 Tip — {tip.title}:</span> {tip.body}</p>
      {/if}
      <button class="btn-arcade mt-3 w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={next}>
        {outOfHearts || isLast ? 'Afronden ■' : 'Volgende ▶'}
      </button>
    </div>
  {/if}
</div>
{/if}
