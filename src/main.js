import '@fontsource/press-start-2p/latin-400.css'; // pixel-font voor HUD-labels (SIL OFL)
import '@fontsource-variable/space-grotesk'; // hoofdlettertype (SIL OFL) — karaktervol, sterke cijfers
import './app.css';
import App from './App.svelte';

// Ruim een eventueel achtergebleven service worker + caches op (de oude PWA gaf een
// herlaad-lus). BELANGRIJK: hier NIET herladen — alleen opruimen, zodat de lus stopt.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}
if (typeof caches !== 'undefined' && caches?.keys) {
  caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
}

const app = new App({
  target: document.getElementById('app')
});

export default app;
