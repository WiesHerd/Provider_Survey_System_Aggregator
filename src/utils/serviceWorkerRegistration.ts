/**
 * Service Worker Registration
 * Registers the service worker for offline capability and asset caching
 */

export const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered successfully:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available - force immediate update
              console.log('🔄 New service worker available. Forcing immediate update...');
              // Skip waiting and take control immediately
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
      
      // Listen for skip waiting message
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          window.location.reload();
        }
      });

      // Handle service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('🔄 Service worker updated. Reloading page...');
          window.location.reload();
        }
      });

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  } else {
    console.warn('⚠️ Service Workers are not supported in this browser');
  }
};

export const unregisterServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      console.log('✅ Service Worker unregistered');
    } catch (error) {
      console.error('❌ Service Worker unregistration failed:', error);
    }
  }
};

