import '@fontsource/press-start-2p/latin-400.css'; // pixel-font (SIL OFL, vrij te gebruiken)
import './app.css';
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;
