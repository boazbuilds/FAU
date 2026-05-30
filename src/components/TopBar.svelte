<script>
  import { profile } from '../stores/profile.js';
  import { settings } from '../stores/settings.js';
  import { levelProgress } from '../lib/gamify.js';
  import MusicControl from './MusicControl.svelte';

  $: lp = levelProgress($profile.xp);
</script>

<div class="flex items-center justify-between gap-2 border-b border-cyan-500/20 bg-slate-950/40 px-4 py-3 backdrop-blur">
  <div class="flex items-center gap-1.5 text-amber-400" title="Streak (dagen op rij)">
    <span>🔥</span><span class="font-pixel text-[10px] text-amber-300">{$profile.streak.current}</span>
  </div>

  <div class="flex items-center gap-1.5" title="Ervaringspunten en niveau">
    <span>⭐</span>
    <span class="font-pixel text-[10px] neon-cyan">{$profile.xp}</span>
    <span class="font-pixel text-[8px] text-slate-500">NV{lp.level}</span>
  </div>

  <div class="flex items-center gap-2.5">
    <div class="flex items-center gap-1 text-rose-400" title="Levens">
      <span>❤️</span>
      <span class="font-pixel text-[10px] text-rose-300">{$settings.heartsEnabled ? $profile.hearts : '∞'}</span>
    </div>
    <MusicControl showName={false} />
  </div>
</div>
