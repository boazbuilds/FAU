<script>
  // Game-HUD: streak-vlam (gloeit als het dagdoel vandaag binnen is), level-badge
  // met XP, levens — en daaronder een dunne XP-balk richting het volgende level.
  import { profile } from '../stores/profile.js';
  import { settings } from '../stores/settings.js';
  import { levelProgress } from '../lib/gamify.js';
  import { todayNumber } from '../lib/day.js';
  import MusicControl from './MusicControl.svelte';

  $: lp = levelProgress($profile.xp);
  $: streakLive = $profile.streak.lastActiveDay === todayNumber(); // dagdoel vandaag gehaald
</script>

<div class="border-b border-cyan-500/20 bg-slate-950/40 backdrop-blur">
  <div class="flex items-center justify-between gap-2 px-4 pb-2 pt-2.5">
    <div
      class="flex items-center gap-1.5 {streakLive ? 'streak-live' : ''}"
      title={streakLive ? `Streak: ${$profile.streak.current} dagen — vandaag al gehaald 🔥` : `Streak: ${$profile.streak.current} dagen — haal je dagdoel om 'm te verlengen`}
    >
      <span class={streakLive ? '' : 'opacity-50 grayscale'}>🔥</span>
      <span class="font-pixel text-[10px] text-amber-300">{$profile.streak.current}</span>
    </div>

    <div class="flex items-center gap-2" title="Niveau {lp.level} — nog {lp.toNext} XP tot niveau {lp.level + 1}">
      <span class="grid h-6 place-items-center rounded-md border border-cyan-400/40 bg-cyan-500/10 px-1.5 font-pixel text-[8px] neon-cyan">NV{lp.level}</span>
      <span class="font-pixel text-[10px] neon-cyan">{$profile.xp}</span>
      <span class="hidden font-pixel text-[7px] text-slate-500 min-[380px]:inline">nog {lp.toNext}</span>
    </div>

    <div class="flex items-center gap-2.5">
      <div class="flex items-center gap-1 text-rose-400" title="Levens">
        <span>❤️</span>
        <span class="font-pixel text-[10px] text-rose-300">{$settings.heartsEnabled ? $profile.hearts : '∞'}</span>
      </div>
      <MusicControl showName={false} />
    </div>
  </div>

  <!-- XP-balk naar het volgende level -->
  <div class="h-1 w-full overflow-hidden bg-slate-900/80" aria-hidden="true">
    <div class="xpbar h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 transition-all duration-500" style="width:{Math.round(lp.pct * 100)}%"></div>
  </div>
</div>
