<script>
  // Startscherm: de 4 modi (knoppen) uit het app-bestand. Per modus starten we de
  // bijbehorende sessie/track. Snel = random; Pad/Leercurve = lespad per track;
  // Mock = de doorlopende mock-casus.
  import { get } from 'svelte/store';
  import { go, activeSession, pathTrack } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { settings } from '../stores/settings.js';
  import { buildQuickSession, buildSession, buildBossSession, dueCount } from '../lib/session.js';
  import { predict } from '../lib/predict.js';
  import { todayNumber } from '../lib/day.js';
  import { motivationOfDay, randomFrom, motivation } from '../lib/humor.js';
  import Mascot from '../components/Mascot.svelte';

  $: due = dueCount($srs);
  $: pred = predict($srs);
  $: goalPct = $profile.dailyGoalXp ? Math.min(1, ($profile.today.xp ?? 0) / $profile.dailyGoalXp) : 0;

  function snel() {
    activeSession.set({ ids: buildQuickSession(get(srs), 10), mode: 'quick' });
    go('session');
  }
  function openPad(track) {
    pathTrack.set(track);
    go('path');
  }
  function mock() {
    // De doorlopende mock-casus (insmock) in vaste volgorde; eigen 'mock'-modus
    // (geen levens, geen pad-voortgang) — telt wel mee als sessie + XP.
    activeSession.set({ ids: buildBossSession('insmock'), mode: 'mock' });
    go('session');
  }
  function review() {
    const s = get(settings);
    activeSession.set({ ids: buildSession(get(srs), { length: s.sessionLength, newCount: 0 }), mode: 'review' });
    go('session');
  }

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Goedenacht' : hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
  let quote = motivationOfDay(todayNumber());
  function newQuote() {
    let n = quote;
    while (motivation.length > 1 && n === quote) n = randomFrom(motivation);
    quote = n;
  }

  // De 4 modi-kaarten.
  const modeCards = [
    { icon: '⚡', title: 'Snel oefenen', desc: 'Random mix — losse vragen tegen jezelf', border: 'hover:border-cyan-400/60', ring: 'bg-cyan-500/15', fn: snel },
    { icon: '🛤️', title: 'Het pad', desc: 'Op volgorde: Kennis → Techniek → Eindbaas', border: 'hover:border-indigo-400/60', ring: 'bg-indigo-500/15', fn: () => openPad('pad') },
    { icon: '📈', title: 'Extra leercurve', desc: 'Verdiepende trainingsmodules', border: 'hover:border-violet-400/60', ring: 'bg-violet-500/15', fn: () => openPad('leercurve') },
    { icon: '🏁', title: 'Mock-examen', desc: 'Eén doorlopende casus — 100 punten', border: 'hover:border-amber-400/60', ring: 'bg-amber-500/15', fn: mock }
  ];
</script>

<div class="space-y-4 px-4 pb-28 pt-2">
  <div class="flex items-center justify-between">
    <div class="min-w-0">
      <h1 class="truncate font-pixel text-sm uppercase neon-cyan">{greeting}</h1>
      <p class="mt-1 text-xs text-slate-400">Kies je modus en oefen de instellingstoets 👾</p>
    </div>
    <button class="btn-arcade shrink-0 rounded-xl px-3 py-2 font-pixel text-[9px] uppercase" on:click={() => go('cheatsheet')}>📕 Spiek</button>
  </div>

  <button type="button" class="block w-full text-left" on:click={newQuote} aria-label="Nieuwe quote">
    <Mascot mood="happy" hint="tik voor nieuwe motivatie 🔁">{quote}</Mascot>
  </button>

  <!-- Dagdoel + herhaling -->
  <div class="arcade-panel flex items-center gap-3 rounded-2xl p-4">
    <div class="flex-1">
      <div class="mb-1 flex items-center justify-between font-pixel text-[8px] uppercase tracking-wide text-slate-400">
        <span>Dagdoel</span><span class="text-cyan-300">{$profile.today.xp ?? 0}/{$profile.dailyGoalXp} XP</span>
      </div>
      <div class="h-2.5 overflow-hidden rounded-full border border-cyan-500/20 bg-slate-900">
        <div class="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all" style="width:{Math.round(goalPct * 100)}%"></div>
      </div>
    </div>
    <button
      class="btn-arcade btn-arcade-magenta shrink-0 rounded-xl px-3 py-2 font-pixel text-[9px] uppercase disabled:opacity-40"
      on:click={review}
      disabled={due === 0}
      title="Herhaal vragen die vandaag aan de beurt zijn"
    >🔁 Herhaal{due > 0 ? ` (${due})` : ''}</button>
  </div>

  <!-- De 4 modi -->
  <div class="space-y-2.5">
    {#each modeCards as m}
      <button
        type="button"
        class="arcade-panel flex w-full items-center gap-3 rounded-2xl p-4 text-left transition {m.border}"
        on:click={m.fn}
      >
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl {m.ring}">{m.icon}</span>
        <div class="min-w-0 flex-1">
          <div class="font-pixel text-[11px] uppercase tracking-wide text-white">{m.title}</div>
          <div class="mt-1 text-xs text-slate-400">{m.desc}</div>
        </div>
        <span class="text-slate-500">▸</span>
      </button>
    {/each}
  </div>

  <!-- Slaagkans -->
  <button class="arcade-panel flex w-full items-center justify-between rounded-2xl p-5 text-left transition hover:border-cyan-400/50" on:click={() => go('predict')}>
    <div>
      <div class="font-pixel text-[8px] uppercase tracking-wide text-slate-400">Geschatte slagingskans</div>
      <div class="mt-1.5 font-pixel text-xl neon-magenta">{pred.enoughData ? `${Math.round(pred.pPass / 0.05) * 5}%` : '—'}</div>
      <div class="mt-1 text-xs text-slate-500">{pred.enoughData ? 'schatting, geen garantie' : 'oefen meer voor een schatting'}</div>
    </div>
    <div class="text-3xl">🔮</div>
  </button>
</div>
