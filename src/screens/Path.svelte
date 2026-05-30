<script>
  import { get } from 'svelte/store';
  import { go, activeSession } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { progress } from '../stores/progressStore.js';
  import { settings } from '../stores/settings.js';
  import { modules } from '../lib/content.js';
  import { buildSession, buildLessonSession, buildBossSession, dueCount } from '../lib/session.js';
  import { isLessonUnlocked, isModuleUnlocked, moduleProgress } from '../lib/progress.js';
  import { predict } from '../lib/predict.js';
  import LessonNode from '../components/LessonNode.svelte';

  $: due = dueCount($srs);
  $: pred = predict($srs);
  $: goalPct = $profile.dailyGoalXp ? Math.min(1, ($profile.today.xp ?? 0) / $profile.dailyGoalXp) : 0;

  // Welke module is "actief" (eerste niet-voltooide ontgrendelde)? Die klappen we open.
  let expanded = {};
  $: {
    // init: open de eerste onvoltooide ontgrendelde module
    if (Object.keys(expanded).length === 0) {
      const active = modules.find(
        (m) => isModuleUnlocked($progress, modules, m.id) && !moduleProgress($progress, m).completed
      );
      if (active) expanded = { [active.id]: true };
    }
  }

  function lessonState(m, l) {
    const rec = $progress.lessons?.[l.id];
    if (rec?.completed) return 'done';
    return isLessonUnlocked($progress, modules, m.id, l.id) ? 'available' : 'locked';
  }

  function openLesson(m, l) {
    if (lessonState(m, l) === 'locked') return;
    if (l.boss) {
      activeSession.set({ ids: buildBossSession(m.id), mode: 'boss', moduleId: m.id });
    } else {
      activeSession.set({ ids: buildLessonSession(l.id), mode: 'lesson', lessonId: l.id, moduleId: m.id });
    }
    go('session');
  }

  function review() {
    const s = get(settings);
    activeSession.set({ ids: buildSession(get(srs), { length: s.sessionLength, newCount: 0 }), mode: 'review' });
    go('session');
  }

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Goedenacht' : hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
</script>

<div class="space-y-4 px-4 pb-28 pt-2">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">{greeting} 👋</h1>
      <p class="text-sm text-slate-400">Jouw pad naar het FAU-tentamen</p>
    </div>
    <button class="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800" on:click={() => go('cheatsheet')}>📕 Spiek</button>
  </div>

  <!-- Dagdoel + herhaling -->
  <div class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
    <div class="flex-1">
      <div class="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>Dagdoel</span><span>{$profile.today.xp ?? 0} / {$profile.dailyGoalXp} XP</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-slate-800">
        <div class="h-full rounded-full bg-indigo-500 transition-all" style="width:{Math.round(goalPct * 100)}%"></div>
      </div>
    </div>
    <button
      class="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
      on:click={review}
      disabled={due === 0}
      title="Herhaal vragen die vandaag aan de beurt zijn"
    >🔁 Herhaal{due > 0 ? ` (${due})` : ''}</button>
  </div>

  <!-- Modules -->
  {#each modules as m (m.id)}
    {@const unlocked = isModuleUnlocked($progress, modules, m.id)}
    {@const mp = moduleProgress($progress, m)}
    <div class="overflow-hidden rounded-2xl border {unlocked ? 'border-slate-800' : 'border-slate-800/60'} bg-slate-900/50">
      <button
        type="button"
        class="flex w-full items-center gap-3 p-4 text-left {unlocked ? '' : 'opacity-60'}"
        on:click={() => (expanded = { ...expanded, [m.id]: !expanded[m.id] })}
      >
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl" style="background:{m.color}22">{m.icon}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate font-semibold text-white">{m.title}</span>
            {#if mp.completed}<span class="text-emerald-400">✓</span>{/if}
          </div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div class="h-full rounded-full transition-all" style="width:{mp.totalLessons ? Math.round((mp.doneLessons / mp.totalLessons) * 100) : 0}%; background:{m.color}"></div>
          </div>
        </div>
        <span class="text-xs text-slate-500">{mp.doneLessons}/{mp.totalLessons}</span>
        <span class="text-slate-500">{expanded[m.id] ? '▾' : '▸'}</span>
      </button>

      {#if expanded[m.id]}
        <div class="space-y-2 px-4 pb-4">
          {#if !unlocked}
            <p class="text-xs text-slate-500">🔒 Rond de vorige module af om dit te ontgrendelen.</p>
          {/if}
          {#each m.lessons as l (l.id)}
            <LessonNode
              lesson={l}
              isBoss={l.boss}
              color={m.color}
              state={lessonState(m, l)}
              stars={$progress.lessons?.[l.id]?.stars ?? 0}
              on:click={() => openLesson(m, l)}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/each}

  <!-- Slaagkans -->
  <button class="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left hover:border-slate-700" on:click={() => go('predict')}>
    <div>
      <div class="text-sm text-slate-400">Geschatte slagingskans</div>
      <div class="text-2xl font-bold text-white">{pred.enoughData ? `${Math.round(pred.pPass / 0.05) * 5}%` : '—'}</div>
      <div class="text-xs text-slate-500">{pred.enoughData ? 'schatting, geen garantie' : 'oefen meer voor een schatting'}</div>
    </div>
    <div class="text-3xl">🔮</div>
  </button>
</div>
