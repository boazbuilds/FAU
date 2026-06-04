import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Belangrijk: GitHub Pages serveert onder /FAU/, dus `base` moet kloppen,
// anders laden de assets niet. Lokaal (npm run dev) werkt dit ook prima.
export default defineConfig({
  base: '/FAU/',
  // Supabase in een eigen chunk; alleen lazy geladen als online aanstaat.
  build: {
    rollupOptions: {
      output: { manualChunks: { supabase: ['@supabase/supabase-js'] } }
    }
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      // Dev service worker uit laten staan voorkomt cache-verwarring tijdens ontwikkelen.
      devOptions: { enabled: false },
      manifest: {
        name: 'FAU — Financial Auditing',
        short_name: 'FAU',
        description: 'Leer Financial Auditing met korte, verslavende dagelijkse vragen.',
        lang: 'nl',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/FAU/',
        scope: '/FAU/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
        // Cache álle JS mee (óók de Supabase-chunk). Anders kan een bijgewerkte
        // app-schil naar een oude, niet-gecachete chunk-hash verwijzen die na een
        // redeploy verdwenen is → "Importing a module script failed" bij inloggen.
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ]
});
