import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Auto-recovery para erros de chunk/SW desatualizado
window.addEventListener('error', (event) => {
  const chunkFailedMessage = /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i;

  if (event.message && chunkFailedMessage.test(event.message)) {
    console.log('🔄 Detectado erro de chunk desatualizado, limpando cache...');

    // Limpa SW e cache, depois recarrega
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        Promise.all(regs.map(reg => reg.unregister()))
          .then(() => caches.keys())
          .then(keys => Promise.all(keys.map(k => caches.delete(k))))
          .then(() => {
            console.log('✅ Cache limpo, recarregando...');
            window.location.reload();
          });
      });
    } else {
      window.location.reload();
    }

    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
