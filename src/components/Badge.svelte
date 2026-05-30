<script>
  export let achievement;
  export let unlocked = true;
  export let size = 'md';
</script>

<div class="flex flex-col items-center gap-1 {unlocked ? '' : 'opacity-40 grayscale'}">
  <div
    class="grid place-items-center rounded-2xl border border-slate-700 bg-slate-800 {size === 'lg'
      ? 'h-16 w-16 text-3xl'
      : 'h-12 w-12 text-2xl'}"
    title={achievement.description}
  >
    {achievement.icon}
  </div>
  <div class="max-w-[76px] text-center text-[10px] leading-tight text-slate-300">
    {achievement.title}
  </div>
</div>
