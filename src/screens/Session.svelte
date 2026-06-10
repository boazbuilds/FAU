<script>
  import { get } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';
  import { activeSession, go } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { progress } from '../stores/progressStore.js';
  import { settings } from '../stores/settings.js';
  import { ratings, rateQuestion } from '../stores/ratings.js';
  import { questionById, topicById, lessonById, modules, tipById, instinkerFor } from '../lib/content.js';
  import { applyResult } from '../lib/srs.js';
  import { xpForAnswer, tallyAnswer, registerGoalProgress, evaluateAchievements } from '../lib/gamify.js';
  import { predict } from '../lib/predict.js';
  import { completeLesson, recordBoss } from '../lib/progress.js';
  import { CONFIG } from '../config.js';
  import { praiseFor, comboMessage, BOSS, randomFrom } from '../lib/humor.js';
  import * as audio from '../lib/audio.js';
  import Question from '../components/Question.svelte';
  import MusicControl from '../components/MusicControl.svelte';
  import FeedbackBar from '../components/FeedbackBar.svelte';

  const sess = get(activeSession) ?? { ids: [], mode: 'normal' };
  const ids = sess.ids ?? [];
  const mode = sess.mode ?? 'normal';
  const lessonId = sess.lessonId ?? null;
  const moduleId = sess.moduleId ?? null;
  const isPractice = mode === 'practice';
  const isBoss = mode === 'boss';
  const isLesson = mode === 'lesson';

  const lesson = lessonId ? lessonById[lessonId] : null;
  const bossIntro = isBoss ? randomFrom(BOSS.intros) : null;
  let showIntro = !!lesson?.casusIntro || isBoss;

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

  // --- Tijd & Sjef-delegatie ---
  let qComp; // ref naar de Question (voor lock() bij time-out)
  let qStart = 0; // wanneer de vraag verscheen (snelheidsbonus)
  let bonusXp = 0; // bonus van deze vraag (voor de feedback)
  let isSjefQ = false; // huidige vraag is door Sjef gedelegeerd
  let sjefTaunt = '';
  let sjefCount = 0; // aantal Sjef-vragen deze sessie
  let timeLeft = 0; // resterende seconden (Sjef)
  let timer = null;
  let lastStartedIndex = -1;

  const SJEF_OK_TYPES = new Set(['mcq', 'truefalse', 'short']); // vergrendelen netjes

  function clearTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Roept startQuestion aan zodra een nieuwe vraag zichtbaar wordt.
  $: if (!showIntro && phase === 'question' && q && index !== lastStartedIndex) {
    lastStartedIndex = index;
    startQuestion();
  }

  function startQuestion() {
    clearTimer();
    qStart = Date.now();
    bonusXp = 0;
    isSjefQ =
      index > 0 &&
      sjefCount < CONFIG.sjef.maxPerSession &&
      SJEF_OK_TYPES.has(q.type) &&
      Math.random() < CONFIG.sjef.chance;
    if (isSjefQ) {
      sjefCount += 1;
      sjefTaunt = randomFrom(BOSS.delegations);
      timeLeft = CONFIG.sjef.seconds;
      audio.tap();
      timer = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          clearTimer();
          if (phase === 'question') {
            qComp?.lock?.();
            register('wrong', true);
          }
        }
      }, 1000);
    }
  }

  // Kies een (willekeurig) energiek nummer voor deze sessie; boss = intens.
  onMount(() => audio.pickSession(isBoss));
  onDestroy(clearTimer);

  $: q = questionById[ids[index]];
  $: topic = q ? topicById[q.topicId] : null;
  $: tip = q?.tipRef ? tipById[q.tipRef] : null;
  // Bij een fout: noem de bekende valkuil (instinker) die bij deze vraag-tags hoort.
  $: valkuil = phase === 'feedback' && lastResult === 'wrong' && q ? instinkerFor(q) : null;
  $: progressPct = ids.length ? (index + (phase === 'feedback' ? 1 : 0)) / ids.length : 0;
  $: isLast = index + 1 >= ids.length;

  function heartsActive() {
    // mild: oefenen, boss, snel én mock kosten geen levens
    return !['practice', 'boss', 'quick', 'mock'].includes(mode) && get(settings).heartsEnabled;
  }

  $: rating = q ? $ratings[q.id] : undefined;
  function rate(value) {
    if (!q) return;
    audio.tap();
    rateQuestion(q.id, value);
  }

  let lastFraction = null; // exacte score van een casus_bouw (voor boss-slagen)
  function onAnswer(e) {
    lastFraction = e.detail.fraction ?? null;
    register(e.detail.result, false);
  }

  function register(result, timedOut) {
    clearTimer();
    const elapsed = Date.now() - qStart;
    lastResult = result;
    results = [...results, { id: q.id, result, fraction: timedOut ? 0 : lastFraction }];

    // Combo (Duolingo-stijl): opbouwen bij goed, breken bij fout, gelijk bij deels.
    if (result === 'correct') {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
    } else if (result === 'wrong') {
      combo = 0;
    }
    comboMsg = result === 'correct' ? comboMessage(combo) : null;

    // Bonussen: snelheid + Sjef (alleen bij goed, niet na een time-out).
    bonusXp = 0;
    if (result === 'correct' && !timedOut) {
      if (elapsed <= CONFIG.speedBonus.withinMs) bonusXp += CONFIG.speedBonus.xp;
      if (isSjefQ) bonusXp += CONFIG.sjef.bonusXp;
    }

    // Feedback-kop met context (time-out / Sjef-overwinning / normaal).
    if (timedOut) feedbackHead = '⏰ ' + randomFrom(BOSS.timeouts);
    else if (isSjefQ && result === 'correct') feedbackHead = 'Sjef baalt — knap gedaan! 🦥';
    else feedbackHead = praiseFor(result);

    // Bevredigende arcade-feedback.
    if (result === 'correct') {
      audio.correct(combo);
      if (comboMsg || bonusXp) audio.comboFlair(combo);
    } else if (result === 'partial') {
      audio.partial();
    } else {
      audio.wrong();
    }
    const gained = xpForAnswer(result, q.difficulty) + bonusXp;
    sessionXp += gained;

    srs.update((s) => {
      s.items = s.items ?? {};
      s.items[q.id] = applyResult(s.items[q.id], result);
      return s;
    });

    profile.update((p) => {
      tallyAnswer(p, result, gained);
      if (heartsActive() && result === 'wrong') {
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
    // Score: gebruik exacte fracties als die er zijn (casus_bouw), anders goed/totaal.
    const hasFractions = results.some((r) => typeof r.fraction === 'number');
    const score = answered
      ? hasFractions
        ? results.reduce((s, r) => s + (typeof r.fraction === 'number' ? r.fraction : r.result === 'correct' ? 1 : 0), 0) / answered
        : correct / answered
      : 0;
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

    // Bouwsteen-Eindbaas: toon de score in punten (CA-voorblad-stijl).
    const buildQ = ids.length === 1 ? questionById[ids[0]] : null;
    const isBuild = buildQ?.type === 'build';

    activeSession.set({
      summary: {
        answered, correct, score, xpGained: sessionXp, perfect, outOfHearts,
        mode, lessonId, moduleId, maxCombo,
        boss: bossResult,
        newBadges, pred,
        isBuild,
        punten: isBuild ? buildQ.punten ?? null : null,
        gotPunten: isBuild && buildQ.punten != null ? Math.round(score * buildQ.punten) : null
      }
    });
    // Cloud-push gebeurt automatisch via de store-subscriptie in App.svelte
    // (schedulePush), dus hier niets extra nodig.
    go('results');
  }

  function quit() {
    clearTimer();
    activeSession.set(null);
    go('home');
  }

  const headerLabel = isBoss ? `${BOSS.emoji} ${BOSS.name}` : isPractice ? 'oefenen' : lesson ? lesson.title : '';
</script>

{#if showIntro && isBoss}
  <div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-4 px-6 text-center">
    <div class="animate-bob text-7xl">{BOSS.emoji}</div>
    <div class="font-pixel text-[9px] uppercase tracking-wide neon-magenta glitch">⚔️ Eindbaas</div>
    <h1 class="font-pixel text-lg leading-relaxed text-white">{BOSS.name}</h1>
    <p class="font-pixel text-[8px] uppercase tracking-wide text-amber-400/80">{BOSS.role}</p>
    <p class="mx-auto max-w-sm text-sm italic leading-relaxed text-slate-200">{bossIntro}</p>
    <button class="btn-arcade btn-arcade-magenta mt-2 w-full rounded-xl py-3 font-pixel text-xs uppercase" on:click={() => (showIntro = false)}>Versla hem ⚔️</button>
    <button class="font-pixel text-[9px] uppercase text-slate-500 hover:text-white" on:click={quit}>Later</button>
  </div>
{:else if showIntro}
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
      {#if isSjefQ && phase === 'question'}
        <div class="mb-3 animate-floatup rounded-xl border border-amber-500/50 bg-amber-950/40 p-3">
          <div class="flex items-center gap-2">
            <span class="animate-wiggle text-2xl">{BOSS.emoji}</span>
            <div class="min-w-0 flex-1">
              <div class="font-pixel text-[8px] uppercase tracking-wide text-amber-300">Sjef delegeert!</div>
              <p class="truncate text-xs text-amber-100/90">{sjefTaunt}</p>
            </div>
            <span class="font-pixel text-sm {timeLeft <= 5 ? 'animate-shake text-rose-400' : 'text-amber-300'}">{timeLeft}s</span>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-900/50">
            <div class="h-full {timeLeft <= 5 ? 'bg-rose-500' : 'bg-amber-400'} transition-all duration-1000 ease-linear" style="width:{Math.max(0, (timeLeft / CONFIG.sjef.seconds) * 100)}%"></div>
          </div>
        </div>
      {/if}
      {#key q.id}
        <Question bind:this={qComp} question={q} on:answer={onAnswer} />
      {/key}
    {/if}
  </main>

  {#if phase === 'feedback' && q}
    <FeedbackBar
      result={lastResult}
      headline={feedbackHead}
      explanation={q.explanation}
      {tip}
      {valkuil}
      nextLabel={outOfHearts || isLast ? 'Afronden ■' : 'Volgende ▶'}
      on:next={next}
    >
      <svelte:fragment slot="head">
        {#if bonusXp > 0}
          <div class="mb-2 animate-burst font-pixel text-[10px] uppercase tracking-wide text-cyan-300">{isSjefQ ? '🦥 Sjef-bonus' : '⚡ Snel'} +{bonusXp} XP</div>
        {/if}
        {#if comboMsg}
          <div class="mb-2 animate-burst rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-bold text-amber-300">🔥 {comboMsg}</div>
        {/if}
        {#if q.type === 'short'}
          <div class="mb-1 text-sm text-slate-200">Geaccepteerd antwoord: <span class="font-semibold">{q.answer.accept[0]}</span></div>
        {/if}
      </svelte:fragment>
      <svelte:fragment slot="actions">
        <!-- Beoordeel de vraag: 👎 = minder vaak tonen -->
        <div class="mt-3 flex items-center justify-center gap-2 text-xs">
          <span class="text-slate-500">Vraag:</span>
          <button
            class="rounded-lg border px-2.5 py-1 transition {rating === 'up' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}"
            on:click={() => rate('up')}
            aria-label="Goede vraag"
          >👍</button>
          <button
            class="rounded-lg border px-2.5 py-1 transition {rating === 'down' ? 'border-rose-500 bg-rose-500/15 text-rose-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}"
            on:click={() => rate('down')}
            aria-label="Deze vraag minder vaak tonen"
          >👎 {rating === 'down' ? 'minder getoond' : 'minder tonen'}</button>
        </div>
      </svelte:fragment>
    </FeedbackBar>
  {/if}
</div>
{/if}
