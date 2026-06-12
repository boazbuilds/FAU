<script>
  // Startscherm. Bovenaan kies je het tentamen (Instellingstoets / Landelijk); de
  // modi en het cijfer passen zich daarop aan. Modi: Snel / Het pad / Blitzkrieg
  // (beide tentamens) + Extra leercurve / Mock / DEADLINE (alleen instellingstoets).
  import { get } from 'svelte/store';
  import { go, activeSession, pathTrack, examScope } from '../stores/ui.js';
  import { profile } from '../stores/profile.js';
  import { srs } from '../stores/srsStore.js';
  import { settings } from '../stores/settings.js';
  import { buildQuickSession, buildSession, buildBossSession, buildDeadlineSession, dueCount } from '../lib/session.js';
  import { deadlineState } from '../stores/deadline.js';
  import { predict, estimateCijfer } from '../lib/predict.js';
  import { dailyQuests, questProgress, rollChest } from '../lib/quests.js';
  import { registerGoalProgress } from '../lib/gamify.js';
  import * as audio from '../lib/audio.js';
  import { todayNumber } from '../lib/day.js';
  import { motivationOfDay, randomFrom, motivation } from '../lib/humor.js';
  import Mascot from '../components/Mascot.svelte';

  $: due = dueCount($srs);
  $: pred = predict($srs);
  $: grade = estimateCijfer($srs, $profile);
  $: goalPct = $profile.dailyGoalXp ? Math.min(1, ($profile.today.xp ?? 0) / $profile.dailyGoalXp) : 0;

  // 🎯 Dagmissies: voortgang uit de dagtellers; alle 3 gehaald → schatkist.
  let chestReward = null;
  $: questViews = dailyQuests().map((quest) => ({ quest, prog: questProgress(quest, $profile.today) }));
  $: questsDone = questViews.filter((v) => v.prog.done).length;
  $: allQuestsDone = questsDone === questViews.length;
  function openChest() {
    if (get(profile).today.chestClaimed) return;
    const r = rollChest();
    profile.update((p) => {
      p.xp += r.xp;
      p.today.xp = (p.today.xp ?? 0) + r.xp;
      if (p.week) p.week.xp = (p.week.xp ?? 0) + r.xp;
      if (r.freeze) p.streak.freezesOwned = (p.streak.freezesOwned ?? 0) + 1;
      p.today.chestClaimed = true;
      registerGoalProgress(p); // schatkist-XP kan het dagdoel afmaken → streak
      return p;
    });
    chestReward = r;
    audio.fanfare();
  }

  function snel() {
    activeSession.set({ ids: buildQuickSession(get(srs), 10, get(examScope)), mode: 'quick' });
    go('session');
  }
  function openPad() {
    pathTrack.set(get(examScope) === 'landelijk' ? 'basis' : 'pad');
    go('path');
  }
  function leercurve() {
    pathTrack.set('leercurve');
    go('path');
  }
  function drill() {
    pathTrack.set('drill');
    go('path');
  }
  function blitz() {
    go('blitz');
  }
  function mock() {
    activeSession.set({ ids: buildBossSession('insmock'), mode: 'mock' });
    go('session');
  }
  function deadline() {
    go('deadline');
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

  // Universele modi + (alleen instellingstoets) leercurve/mock/deadline.
  const universal = [
    { icon: '⚡', title: 'Snel oefenen', desc: 'Random mix — losse vragen tegen jezelf', ring: 'bg-cyan-500/15', border: 'hover:border-cyan-400/60', fn: snel },
    { icon: '🛤️', title: 'Het pad', desc: 'Op volgorde: Kennis → Techniek → Eindbaas', ring: 'bg-indigo-500/15', border: 'hover:border-indigo-400/60', fn: openPad },
    { icon: '⏱️', title: 'Blitzkrieg', desc: 'Zoveel mogelijk goed tegen de klok', ring: 'bg-rose-500/15', border: 'hover:border-rose-400/60', fn: blitz }
  ];
  // DEADLINE-kaart toont je tussenstand, zodat je ziet dat je kunt hervatten.
  const deadlineTotal = buildDeadlineSession().length;
  $: deadlineDesc =
    $deadlineState.pos > 0 && $deadlineState.pos < deadlineTotal
      ? `▶ Verder bij vraag ${$deadlineState.pos + 1}/${deadlineTotal} → +1 punt`
      : `${deadlineTotal} vragen achter elkaar → +1 punt op je cijfer`;
  $: instellingOnly = [
    { icon: '🛠️', title: 'Drill 250', desc: '10 drill-modules op je leercurve (dr1–dr10)', ring: 'bg-emerald-500/15', border: 'hover:border-emerald-400/60', fn: drill },
    { icon: '📈', title: 'Extra leercurve', desc: 'Verdiepende trainingsmodules', ring: 'bg-violet-500/15', border: 'hover:border-violet-400/60', fn: leercurve },
    { icon: '🏁', title: 'Mock-examen', desc: 'Eén doorlopende casus — 100 punten', ring: 'bg-amber-500/15', border: 'hover:border-amber-400/60', fn: mock },
    { icon: '🎯', title: 'DEADLINE', desc: deadlineDesc, ring: 'bg-fuchsia-500/15', border: 'hover:border-fuchsia-400/60', fn: deadline }
  ];
  $: cards = $examScope === 'landelijk' ? universal : [...universal.slice(0, 2), ...instellingOnly, universal[2]];
</script>

<div class="space-y-4 px-4 pb-28 pt-2">
  <div class="flex items-center justify-between">
    <div class="min-w-0">
      <h1 class="truncate font-pixel text-sm uppercase neon-cyan">{greeting}</h1>
      <p class="mt-1 text-xs text-slate-400">Kies je tentamen en oefen 👾</p>
    </div>
    <button class="btn-arcade shrink-0 rounded-xl px-3 py-2 font-pixel text-[9px] uppercase" on:click={() => go('cheatsheet')}>📕 Spiek</button>
  </div>

  <!-- Tentamen-keuze (toggle) -->
  <div class="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-1.5">
    <button
      class="rounded-xl py-2.5 font-pixel text-[9px] uppercase tracking-wide transition {$examScope === 'instelling' ? 'btn-arcade' : 'text-slate-400 hover:text-slate-200'}"
      on:click={() => examScope.set('instelling')}
    >🎓 Instellingstoets</button>
    <button
      class="rounded-xl py-2.5 font-pixel text-[9px] uppercase tracking-wide transition {$examScope === 'landelijk' ? 'btn-arcade' : 'text-slate-400 hover:text-slate-200'}"
      on:click={() => examScope.set('landelijk')}
    >🗺️ Landelijk</button>
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

  <!-- 🎯 Dagmissies + schatkist -->
  <div class="arcade-panel rounded-2xl p-4">
    <div class="mb-2.5 flex items-center justify-between">
      <span class="font-pixel text-[8px] uppercase tracking-wide text-slate-400">🎯 Dagmissies</span>
      <span class="font-pixel text-[8px] {allQuestsDone ? 'text-emerald-300' : 'text-slate-500'}">{questsDone}/{questViews.length}</span>
    </div>
    <div class="space-y-2.5">
      {#each questViews as v (v.quest.id)}
        <div class="flex items-center gap-2.5">
          <span class="text-base">{v.quest.icon}</span>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2 text-xs">
              <span class={v.prog.done ? 'text-emerald-300 line-through decoration-emerald-500/60' : 'text-slate-200'}>{v.quest.label}</span>
              <span class="shrink-0 font-pixel text-[8px] {v.prog.done ? 'text-emerald-300' : 'text-slate-500'}">{v.prog.done ? '✓' : `${v.prog.value}/${v.quest.target}`}</span>
            </div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div class="h-full rounded-full {v.prog.done ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-rose-500'} transition-all" style="width:{Math.round(v.prog.pct * 100)}%"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
    {#if chestReward}
      <div class="mt-3 animate-pop rounded-xl border border-amber-500/50 bg-amber-950/40 p-3 text-center">
        <div class="text-2xl">🎉</div>
        <div class="mt-1 font-pixel text-[10px] uppercase text-amber-300">+{chestReward.xp} XP{chestReward.freeze ? ' · +1 🧊 streak-freeze' : ''}</div>
      </div>
    {:else if allQuestsDone && !$profile.today.chestClaimed}
      <button class="btn-arcade btn-arcade-magenta card-press mt-3 w-full animate-bob rounded-xl py-3 font-pixel text-[10px] uppercase" on:click={openChest}>🎁 Open je schatkist</button>
    {:else if allQuestsDone}
      <p class="mt-3 text-center text-xs text-emerald-300">🏆 Alles binnen — morgen 3 nieuwe missies!</p>
    {/if}
  </div>

  <!-- Modi -->
  <div class="space-y-2.5">
    {#each cards as m (m.title)}
      <button type="button" class="arcade-panel card-press flex w-full items-center gap-3 rounded-2xl p-4 text-left transition {m.border}" on:click={m.fn}>
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl {m.ring}">{m.icon}</span>
        <div class="min-w-0 flex-1">
          <div class="font-pixel text-[11px] uppercase tracking-wide text-white">{m.title}</div>
          <div class="mt-1 text-xs text-slate-400">{m.desc}</div>
        </div>
        <span class="text-slate-500">▸</span>
      </button>
    {/each}
  </div>

  {#if $examScope === 'instelling'}
    <!-- Geschat cijfer (instellingstoets) -->
    <div class="arcade-panel flex items-center justify-between rounded-2xl p-5">
      <div>
        <div class="font-pixel text-[8px] uppercase tracking-wide text-slate-400">Geschat cijfer</div>
        <div class="mt-1.5 font-pixel text-xl {grade.voldoende ? 'neon-cyan' : 'neon-magenta'}">{grade.hasData ? grade.cijfer.toFixed(1) : '—'}<span class="text-sm text-slate-500"> / 10</span></div>
        <div class="mt-1 text-xs text-slate-500">{grade.bonus > 0 ? `incl. +${grade.bonus} DEADLINE-bonus` : grade.hasData ? 'schatting, geen garantie' : 'oefen meer voor een schatting'}</div>
      </div>
      <div class="text-3xl">{grade.voldoende ? '🎓' : '📚'}</div>
    </div>
  {:else}
    <!-- Slaagkans (landelijk) -->
    <button class="arcade-panel flex w-full items-center justify-between rounded-2xl p-5 text-left transition hover:border-cyan-400/50" on:click={() => go('predict')}>
      <div>
        <div class="font-pixel text-[8px] uppercase tracking-wide text-slate-400">Geschatte slagingskans</div>
        <div class="mt-1.5 font-pixel text-xl neon-magenta">{pred.enoughData ? `${Math.round(pred.pPass / 0.05) * 5}%` : '—'}</div>
        <div class="mt-1 text-xs text-slate-500">{pred.enoughData ? 'schatting, geen garantie' : 'oefen meer voor een schatting'}</div>
      </div>
      <div class="text-3xl">🔮</div>
    </button>
  {/if}
</div>
