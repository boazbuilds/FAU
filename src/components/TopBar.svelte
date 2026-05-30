<script>
  import { profile } from '../stores/profile.js';
  import { settings } from '../stores/settings.js';
  import { levelProgress } from '../lib/gamify.js';

  $: lp = levelProgress($profile.xp);
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

  <div class="flex items-center gap-1 font-semibold text-rose-400" title="Levens">
    <span>❤️</span>
    <span>{$settings.heartsEnabled ? $profile.hearts : '∞'}</span>
  </div>
</div>
