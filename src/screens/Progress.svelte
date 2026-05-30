<script>
  import { srs } from '../stores/srsStore.js';
  import { profile } from '../stores/profile.js';
  import { topics, achievements as achievementDefs } from '../lib/content.js';
  import { topicStats } from '../lib/predict.js';
  import { levelProgress, leagueFromLevel } from '../lib/gamify.js';
  import Badge from '../components/Badge.svelte';

  $: stats = topicStats($srs);
  $: lp = levelProgress($profile.xp);
  $: league = leagueFromLevel(lp.level);
</script>

<div class="space-y-6 px-4 pb-28 pt-2">
  <h1 class="text-2xl font-bold text-white">Voortgang</h1>

  <div class="grid grid-cols-3 gap-3 text-center">
    <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div class="text-xl font-bold text-white">{$profile.totals.answered ?? 0}</div>
      <div class="text-[11px] text-slate-400">vragen</div>
    </div>
    <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div class="text-xl font-bold text-amber-400">{$profile.streak.longest ?? 0}</div>
      <div class="text-[11px] text-slate-400">langste streak</div>
    </div>
    <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div class="text-xl font-bold text-indigo-300">{lp.level}</div>
      <div class="text-[11px] text-slate-400">{league.label}</div>
    </div>
  </div>

  <div class="space-y-3">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Beheersing per onderwerp</h2>
    {#each topics as t}
      {@const s = stats[t.id]}
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-medium text-white">{t.icon} {t.title}</span>
          <span class="text-sm font-semibold" style="color:{t.color}">{Math.round(s.mastery * 100)}%</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-slate-800">
          <div class="h-full rounded-full transition-all" style="width:{Math.round(s.mastery * 100)}%; background:{t.color}"></div>
        </div>
        <div class="mt-1 text-xs text-slate-500">{s.seen}/{s.total} vragen gezien</div>
      </div>
    {/each}
  </div>

  <div class="space-y-3">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Badges</h2>
    <div class="grid grid-cols-4 gap-4">
      {#each achievementDefs as a}
        <Badge achievement={a} unlocked={!!$profile.achievements[a.id]} />
      {/each}
    </div>
  </div>
</div>
