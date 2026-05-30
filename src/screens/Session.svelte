<script>
  import { get } from 'svelte/store';
  import { activeSession, go } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { settings } from '../stores/settings.js';
  import { questionById, topicById } from '../lib/content.js';
  import { applyResult } from '../lib/srs.js';
  import { xpForAnswer, registerGoalProgress, evaluateAchievements } from '../lib/gamify.js';
  import { predict, topicStats } from '../lib/predict.js';
  import { CONFIG } from '../config.js';
  import Question from '../components/Question.svelte';

  const sess = get(activeSession) ?? { ids: [], mode: 'normal' };
  const ids = sess.ids ?? [];
  const isPractice = sess.mode === 'practice';

  let index = 0;
  let phase = 'question'; // 'question' | 'feedback'
  let results = [];
  let sessionXp = 0;
  let lastResult = null;
  let outOfHearts = false;

  $: q = questionById[ids[index]];
  $: topic = q ? topicById[q.topicId] : null;
  $: progress = ids.length ? (index + (phase === 'feedback' ? 1 : 0)) / ids.length : 0;
  $: isLast = index + 1 >= ids.length;

  function heartsActive() {
    return !isPractice && get(settings).heartsEnabled;
  }

  function onAnswer(e) {
    const result = e.detail.result;
    lastResult = result;
    results = [...results, { id: q.id, result }];
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
    const perfect = answered > 0 && !outOfHearts && results.every((r) => r.result === 'correct');

    let bonus = 0;
    profile.update((p) => {
      const firstToday = (p.today.sessions ?? 0) === 0;
      p.today.sessions = (p.today.sessions ?? 0) + 1;
      p.totals.sessions = (p.totals.sessions ?? 0) + 1;
      if (!isPractice) {
        if (perfect) bonus += CONFIG.perfectSessionBonus;
        if (firstToday) bonus += CONFIG.firstSessionOfDayBonus;
        p.xp += bonus;
        p.today.xp += bonus;
        registerGoalProgress(p);
      } else {
        p.hearts = CONFIG.maxHearts; // oefenen herstelt levens
        p.heartsUpdatedAt = Date.now();
      }
      return p;
    });
    sessionXp += bonus;

    const stats = topicStats(get(srs));
    const pred = predict(get(srs));
    let newBadges = [];
    profile.update((p) => {
      newBadges = evaluateAchievements(p, {
        predictResult: pred,
        topicStats: stats,
        perfectSession: perfect
      });
      return p;
    });

    activeSession.set({
      summary: { answered, correct, xpGained: sessionXp, perfect, outOfHearts, isPractice, newBadges, pred }
    });
    go('results');
  }

  function quit() {
    activeSession.set(null);
    go('home');
  }
</script>

<div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
  <header class="flex items-center gap-3 px-4 py-3">
    <button class="text-xl text-slate-400 hover:text-white" on:click={quit} aria-label="Sluiten">✕</button>
    <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
      <div class="h-full rounded-full bg-indigo-500 transition-all duration-300" style="width:{Math.round(progress * 100)}%"></div>
    </div>
    {#if !isPractice && $settings.heartsEnabled}
      <div class="flex items-center gap-1 text-sm font-semibold text-rose-400"><span>❤️</span>{$profile.hearts}</div>
    {:else}
      <div class="text-xs font-medium text-slate-400">oefenen</div>
    {/if}
  </header>

  <main class="flex-1 px-4 pb-32 pt-2">
    {#if !q}
      <div class="mt-20 text-center text-slate-300">
        <p class="text-5xl">📭</p>
        <p class="mt-3">Geen vragen beschikbaar.</p>
        <button class="mt-4 rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white" on:click={quit}>Terug</button>
      </div>
    {:else}
      {#if topic}
        <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{topic.icon} {topic.title}</div>
      {/if}
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
        class="mb-1 font-bold
        {lastResult === 'correct' ? 'text-emerald-300' : lastResult === 'partial' ? 'text-amber-300' : 'text-rose-300'}"
      >
        {lastResult === 'correct'
          ? 'Goed! 🎉'
          : lastResult === 'partial'
            ? 'Deels goed 🟡'
            : q.type === 'open'
              ? 'Volgende keer beter 💪'
              : 'Niet helemaal ❌'}
      </div>
      {#if q.type === 'short'}
        <div class="mb-1 text-sm text-slate-200">Geaccepteerd antwoord: <span class="font-semibold">{q.answer.accept[0]}</span></div>
      {/if}
      <p class="text-sm leading-relaxed text-slate-200">{q.explanation}</p>
      {#if q.reference}<p class="mt-1 text-xs text-slate-400">📖 {q.reference}</p>{/if}
      <button class="mt-3 w-full rounded-xl bg-white py-3 font-bold text-slate-900 hover:bg-slate-100" on:click={next}>
        {outOfHearts || isLast ? 'Afronden' : 'Volgende'}
      </button>
    </div>
  {/if}
</div>
