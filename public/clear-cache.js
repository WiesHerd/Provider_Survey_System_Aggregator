// Cache-busting script to clear browser cache
(function() {
  'use strict';
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('✅ All caches cleared');
    });
  }
  
  // Clear localStorage and sessionStorage
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Local storage cleared');
  } catch (e) {
    console.warn('Could not clear storage:', e);
  }
  
  // Force reload if this script is loaded
  if (window.location.search.includes('clear-cache=true')) {
    console.log('🔄 Cache cleared, reloading...');
    window.location.reload(true);
  }
})();
