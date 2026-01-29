// Import logger FIRST to enable production console overrides before any other code runs
import './shared/utils/logger';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { unregisterServiceWorker } from './utils/serviceWorkerRegistration';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const shouldHandleChunkError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk') ||
    normalized.includes('unexpected token <') && normalized.includes('.chunk.js')
  );
};

const handleChunkLoadFailure = async (message: string) => {
  if (!shouldHandleChunkError(message)) {
    return;
  }

  const hasReloaded = sessionStorage.getItem('chunk-reload-attempted');
  if (hasReloaded) {
    sessionStorage.removeItem('chunk-reload-attempted');
    return;
  }

  sessionStorage.setItem('chunk-reload-attempted', 'true');
  try {
    await unregisterServiceWorker();
  } catch (error) {
    console.error('Failed to unregister service worker after chunk error:', error);
  }
  window.location.reload();
};

// Recover from stale chunk caches in production
if (process.env.NODE_ENV === 'production') {
  // Disable service workers to prevent stale bundle caching
  unregisterServiceWorker().catch((error) => {
    console.error('Failed to unregister service worker on startup:', error);
  });

  window.addEventListener('error', (event) => {
    if (event?.message) {
      void handleChunkLoadFailure(event.message);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const message = reason instanceof Error ? reason.message : String(reason || '');
    if (message) {
      void handleChunkLoadFailure(message);
    }
  });
}

// Top-level error boundary to catch any initialization errors
root.render(
  <React.StrictMode>
    <ErrorBoundary componentName="App">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Service worker intentionally disabled to avoid stale bundle caching