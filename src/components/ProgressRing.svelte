<script>
  export let value = 0; // 0..1
  export let size = 120;
  export let stroke = 10;
  export let color = '#6366f1';
  export let track = 'rgba(255,255,255,0.12)';
  export let label = '';
  export let sublabel = '';

  $: r = (size - stroke) / 2;
  $: c = 2 * Math.PI * r;
  $: offset = c * (1 - Math.max(0, Math.min(1, value)));
</script>

<div class="relative inline-grid place-items-center" style="width:{size}px;height:{size}px">
  <svg width={size} height={size} class="-rotate-90">
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} stroke-width={stroke} />
    <circle
      cx={size / 2}
      cy={size / 2}
      r={r}
      fill="none"
      stroke={color}
      stroke-width={stroke}
      stroke-linecap="round"
      stroke-dasharray={c}
      stroke-dashoffset={offset}
      style="transition: stroke-dashoffset 0.6s ease"
    />
  </svg>
  <div class="absolute text-center leading-tight">
    {#if label}<div class="text-2xl font-bold text-white">{label}</div>{/if}
    {#if sublabel}<div class="text-xs text-slate-400">{sublabel}</div>{/if}
  </div>
</div>
