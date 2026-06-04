import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// GEEN PWA/service worker meer. De self-destruct-SW herlaadde de pagina
// (client.navigate) en werd via registerSW.js bij elke load opnieuw geregistreerd
// → een oneindige herlaad-lus die 100% CPU opslokt (lijkt op 'vastlopen'). De app
// draait nu als gewone site die altijd vers van het netwerk laadt. Een eventueel
// achtergebleven SW wordt in main.js opgeruimd (zonder herladen).
export default defineConfig({
  base: '/FAU/',
  // Supabase in een eigen chunk; alleen lazy geladen als online aanstaat.
  build: {
    rollupOptions: {
      output: { manualChunks: { supabase: ['@supabase/supabase-js'] } }
    }
  },
  plugins: [svelte()]
});
