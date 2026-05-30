<script>
  import { profile } from '../stores/profile.js';
  import { settings } from '../stores/settings.js';
  import { levelProgress } from '../lib/gamify.js';
  import * as audio from '../lib/audio.js';

  $: lp = levelProgress($profile.xp);

  function toggleMusic() {
    audio.unlock(); // ontgrendel meteen op deze tik
    settings.update((s) => { s.music = s.music === false ? true : false; return s; });
  }
</script>

<div class="flex items-center justify-between gap-3 px-4 py-3">
  <div class="flex items-center gap-1.5 font-semibold text-amber-400" title="Streak (dagen op rij)">
    <span>🔥</span><span>{$profile.streak.current}</span>
  </div>

  <div class="flex items-center gap-1.5" title="Ervaringspunten en niveau">
    <span>⭐</span>
    <span class="font-semibold text-white">{$profile.xp}</span>
    <span class="text-xs text-slate-400">· nv {lp.level}</span>
  </div>

  <div class="flex items-center gap-3">
    <div class="flex items-center gap-1 font-semibold text-rose-400" title="Levens">
      <span>❤️</span>
      <span>{$settings.heartsEnabled ? $profile.hearts : '∞'}</span>
    </div>
    <button
      class="text-lg leading-none {$settings.music !== false ? 'text-indigo-400' : 'text-slate-600'}"
      on:click={toggleMusic}
      title="Achtergrondmuziek aan/uit"
      aria-label="Muziek aan of uit"
    >{$settings.music !== false ? '🎵' : '🔇'}</button>
  </div>
</div>
