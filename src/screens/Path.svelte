<script>
  // Lespad voor één track (pad of leercurve): modules op volgorde, met per module
  // de lessen A·Kennis → B·Techniek → C·Eindbaas (de casus_bouw-boss als poort).
  import { go, activeSession, pathTrack } from '../stores/ui.js';
  import { progress } from '../stores/progressStore.js';
  import { modulesForTrack } from '../lib/content.js';
  import { buildLessonSession, buildBossSession } from '../lib/session.js';
  import { isLessonUnlocked, isModuleUnlocked, moduleProgress } from '../lib/progress.js';
  import LessonNode from '../components/LessonNode.svelte';

  $: mods = modulesForTrack($pathTrack);
  $: trackTitle =
    $pathTrack === 'leercurve'
      ? 'Extra leercurve'
      : $pathTrack === 'drill'
        ? 'Drill 250'
        : $pathTrack === 'ops'
          ? 'Opdracht-dossiers'
          : 'Expeditie';
  $: trackSub =
    $pathTrack === 'leercurve'
      ? 'Verdiepende trainingsmodules'
      : $pathTrack === 'drill'
        ? '10 drill-modules (dr1–dr10) op je leercurve — met Eindbazen'
        : $pathTrack === 'ops'
          ? '6 opdrachtsoorten (ops1–ops6): vaste casusstructuur → standaardzinnen → Eindbaas'
          : 'Kennis → Techniek → Eindbaas, op volgorde';

  // Open de eerste onvoltooide ontgrendelde module van deze track (her-init bij wissel).
  let expanded = {};
  let lastTrack = null;
  $: if ($pathTrack !== lastTrack) {
    lastTrack = $pathTrack;
    const active = mods.find((m) => isModuleUnlocked($progress, mods, m.id) && !moduleProgress($progress, m).completed);
    expanded = active ? { [active.id]: true } : {};
  }

  function lessonState(m, l) {
    if (l.boss) {
      if ($progress.modules?.[m.id]?.bossPassed) return 'done';
      return isLessonUnlocked($progress, mods, m.id, l.id) ? 'available' : 'locked';
    }
    const rec = $progress.lessons?.[l.id];
    if (rec?.completed) return 'done';
    return isLessonUnlocked($progress, mods, m.id, l.id) ? 'available' : 'locked';
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
</script>

<div class="space-y-4 px-4 pb-28 pt-2">
  <div class="flex items-center gap-3">
    <button class="text-lg text-slate-400 hover:text-white" on:click={() => go('home')} aria-label="Terug naar modi">←</button>
    <div class="min-w-0">
      <h1 class="truncate font-pixel text-sm uppercase neon-cyan">{trackTitle}</h1>
      <p class="mt-1 text-xs text-slate-400">{trackSub}</p>
    </div>
  </div>

  {#each mods as m (m.id)}
    {@const unlocked = isModuleUnlocked($progress, mods, m.id)}
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
</div>
