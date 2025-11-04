/**
 * Cache utility functions for development
 * Helps prevent caching issues during development
 */

export const clearBrowserCache = async (): Promise<void> => {
  // Clear all caches
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🔍 Cache cleared successfully');
    } catch (error) {
      console.warn('Could not clear caches:', error);
    }
  }

  // Clear localStorage and sessionStorage
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🔍 Storage cleared successfully');
  } catch (error) {
    console.warn('Could not clear storage:', error);
  }
};

export const addCacheBustingToUrl = (url: string): string => {
  const urlObj = new URL(url);
  urlObj.searchParams.set('v', Date.now().toString());
  return urlObj.toString();
};

export const isDevelopment = (): boolean => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost');
};

// Auto-clear cache in development
if (isDevelopment()) {
  // Clear cache on page load in development
  clearBrowserCache();
}
