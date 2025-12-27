// Import logger FIRST to enable production console overrides before any other code runs
import './shared/utils/logger';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Top-level error boundary to catch any initialization errors
root.render(
  <React.StrictMode>
    <ErrorBoundary componentName="App">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for offline capability and asset caching
if (process.env.NODE_ENV === 'production') {
  registerServiceWorker().catch(console.error);
} 