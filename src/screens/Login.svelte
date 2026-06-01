<script>
  // Het inlogscherm: de voordeur van de app. Verschijnt vóór de rest zodra online
  // aanstaat en er nog niemand is ingelogd (zie App.svelte). Inloggen / account
  // maken zet de sessie (de gate sluit dan vanzelf); 'doorgaan als gast' laat je
  // er zonder account in — voortgang blijft dan lokaal op dit apparaat.
  import { isConfigured } from '../lib/cloud/online.js';
  import { guest } from '../stores/auth.js';
  import { signIn, signUp, signInAnonymously } from '../lib/cloud/sync.js';

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

  let guestName = '';
  let guestErr = '';
  let guestBusy = false;

  async function playAsGuest() {
    guestErr = '';
    guestBusy = true;
    try {
      if (isConfigured() && guestName.trim()) {
        // Echte (anonieme) sessie → de gast krijgt een rij in 'players' en komt
        // zo met zijn naam op de ranglijst.
        await signInAnonymously(guestName.trim());
      } else {
        // Geen naam of online uit → lokaal-only gast (geen ranglijst).
        guest.set(true);
      }
    } catch (e) {
      guestErr =
        'Kon de gast-ranglijst niet starten. Anonieme login staat mogelijk uit in Supabase — je kunt wél lokaal verder spelen.';
    } finally {
      guestBusy = false;
    }
  }

  function playLocal() {
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

  <section class="mt-4 arcade-panel space-y-3 rounded-2xl p-5">
    <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Als gast spelen</h2>
    {#if isConfigured()}
      <input
        class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        placeholder="je naam (voor de ranglijst)"
        bind:value={guestName}
        maxlength="20"
        on:keydown={(e) => e.key === 'Enter' && !guestBusy && playAsGuest()}
      />
    {/if}
    <button
      class="btn-arcade w-full rounded-xl py-2.5 font-pixel text-[10px] uppercase disabled:opacity-50"
      on:click={playAsGuest}
      disabled={guestBusy}
    >{guestBusy ? '…' : 'Doorgaan als gast →'}</button>
    {#if guestErr}
      <p class="text-xs text-rose-400">{guestErr}</p>
      <button
        class="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
        on:click={playLocal}
      >Lokaal verder spelen →</button>
    {/if}
    <p class="text-[11px] leading-relaxed text-slate-500">
      {#if isConfigured()}Vul een naam in en je komt op de ranglijst. Je voortgang blijft als gast op dit apparaat (niet gegarandeerd bewaard). Laat de naam leeg om alleen lokaal te spelen.{:else}Je voortgang blijft op dit apparaat (niet in de cloud).{/if}
    </p>
  </section>
</div>
