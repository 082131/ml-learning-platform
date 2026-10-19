import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app/App';
import { appProgressStore } from './app/progress';

// Debounced writes must not be lost when the tab closes.
window.addEventListener('pagehide', () => appProgressStore.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') appProgressStore.flush();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
