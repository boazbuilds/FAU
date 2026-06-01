<script>
  // Het inlogscherm: de voordeur van de app. Verschijnt vóór de rest zodra online
  // aanstaat en er nog niemand is ingelogd (zie App.svelte). Inloggen / account
  // maken zet de sessie (de gate sluit dan vanzelf); 'doorgaan als gast' laat je
  // er zonder account in — voortgang blijft dan lokaal op dit apparaat.
  import { isConfigured } from '../lib/cloud/online.js';
  import { guest } from '../stores/auth.js';
  import { signIn, signUp } from '../lib/cloud/sync.js';

  let email = '';
  let password = '';
  let username = '';
  let mode = 'login'; // 'login' | 'signup'
  let err = '';
  let msg = '';
  let busy = false;

  async function submit() {
    err = msg = '';
    busy = true;
    try {
      if (mode === 'signup') {
        const data = await signUp(email.trim(), password, username.trim());
        // Geen sessie terug? Dan staat e-mailbevestiging aan: even bevestigen, daarna inloggen.
        if (!data?.session?.user) {
          msg = 'Account aangemaakt. Bevestig je e-mail en log daarna in.';
          mode = 'login';
        }
      } else {
        await signIn(email.trim(), password);
      }
      email = password = username = '';
    } catch (e) {
      err = e?.message || 'Er ging iets mis.';
    }
    busy = false;
  }

  function playAsGuest() {
    guest.set(true);
  }
</script>

<div class="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-6 py-10">
  <div class="mb-8 text-center">
    <h1 class="font-pixel text-2xl neon-cyan">FAU</h1>
    <p class="mt-2 text-xs uppercase tracking-[0.3em] text-cyan-300/70">Financial Auditing</p>
    <p class="mt-4 text-sm text-slate-300">Log in om je voortgang en plek op de ranglijst te bewaren.</p>
  </div>

  {#if isConfigured()}
    <section class="arcade-panel space-y-3 rounded-2xl p-5">
      <div class="grid grid-cols-2 gap-2">
        <button
          class="rounded-lg border py-2 text-xs font-medium {mode === 'login' ? 'border-cyan-400 bg-cyan-500/15 text-white' : 'border-slate-700 text-slate-300'}"
          on:click={() => (mode = 'login')}
        >Inloggen</button>
        <button
          class="rounded-lg border py-2 text-xs font-medium {mode === 'signup' ? 'border-cyan-400 bg-cyan-500/15 text-white' : 'border-slate-700 text-slate-300'}"
          on:click={() => (mode = 'signup')}
        >Account maken</button>
      </div>

      {#if mode === 'signup'}
        <input class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" placeholder="gebruikersnaam" bind:value={username} autocomplete="username" />
      {/if}
      <input class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" type="email" placeholder="e-mail" bind:value={email} autocomplete="email" />
      <input class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" type="password" placeholder="wachtwoord" bind:value={password} autocomplete={mode === 'signup' ? 'new-password' : 'current-password'} on:keydown={(e) => e.key === 'Enter' && email && password && submit()} />

      {#if err}<p class="text-xs text-rose-400">{err}</p>{/if}
      {#if msg}<p class="text-xs text-emerald-300">{msg}</p>{/if}

      <button
        class="btn-arcade w-full rounded-xl py-2.5 font-pixel text-[10px] uppercase disabled:opacity-50"
        on:click={submit}
        disabled={busy || !email || !password || (mode === 'signup' && !username.trim())}
      >{busy ? '…' : mode === 'signup' ? 'Account maken' : 'Inloggen'}</button>
    </section>
  {:else}
    <section class="arcade-panel space-y-2 rounded-2xl p-5 text-center">
      <p class="text-sm text-slate-200">Online staat uit op deze build.</p>
      <p class="text-xs leading-relaxed text-slate-400">
        Je kunt direct als gast spelen. Voor accounts + ranglijst: zie
        <span class="font-mono text-slate-300">docs/ONLINE-SETUP.md</span>.
      </p>
    </section>
  {/if}

  <button
    class="mt-4 w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
    on:click={playAsGuest}
  >Doorgaan als gast →</button>
  <p class="mt-2 text-center text-[11px] leading-relaxed text-slate-500">
    Als gast wordt je voortgang alleen op dit apparaat bewaard (niet in de cloud).
  </p>
</div>
