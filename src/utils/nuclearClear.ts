/**
 * Nuclear clear utility - aggressively clears all possible data storage
 * This is a last resort when normal clearing doesn't work
 */

export const nuclearClear = async (): Promise<void> => {
  console.log('🚨 NUCLEAR CLEAR INITIATED - Clearing all possible data storage...');
  
  try {
    // 1. Clear all possible IndexedDB databases
    const dbNames = [
      'SurveyAggregatorDB',
      'survey-data', 
      'SurveyDataDB',
      'survey-aggregator-db',
      'benchpoint-db'
    ];
    
    for (const dbName of dbNames) {
      try {
        const request = indexedDB.deleteDatabase(dbName);
        await new Promise((resolve) => {
          request.onsuccess = () => {
            console.log(`✅ Cleared database: ${dbName}`);
            resolve(true);
          };
          request.onerror = () => {
            console.log(`ℹ️ Database ${dbName} not found (normal)`);
            resolve(true);
          };
        });
      } catch (error) {
        console.log(`ℹ️ Could not clear ${dbName}:`, error);
      }
    }
    
    // 2. Clear localStorage completely
    try {
      localStorage.clear();
      console.log('✅ Cleared localStorage');
    } catch (error) {
      console.log('ℹ️ Could not clear localStorage:', error);
    }
    
    // 3. Clear sessionStorage
    try {
      sessionStorage.clear();
      console.log('✅ Cleared sessionStorage');
    } catch (error) {
      console.log('ℹ️ Could not clear sessionStorage:', error);
    }
    
    // 4. Clear all cookies for this domain
    try {
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      });
      console.log('✅ Cleared cookies');
    } catch (error) {
      console.log('ℹ️ Could not clear cookies:', error);
    }
    
    // 5. Clear any cached data
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ Cleared service worker caches');
      }
    } catch (error) {
      console.log('ℹ️ Could not clear caches:', error);
    }
    
    console.log('🎉 NUCLEAR CLEAR COMPLETE - All data storage cleared!');
    
    // Force reload after a short delay
    setTimeout(() => {
      console.log('🔄 Reloading page to ensure clean state...');
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Nuclear clear failed:', error);
    throw error;
  }
};

/**
 * Check what databases exist in IndexedDB
 */
export const inspectIndexedDB = async (): Promise<string[]> => {
  const databases: string[] = [];
  
  // This is a bit of a hack since there's no direct API to list databases
  // We'll try to open known database names and see which ones exist
  const knownDbs = [
    'SurveyAggregatorDB',
    'survey-data',
    'SurveyDataDB', 
    'survey-aggregator-db',
    'benchpoint-db'
  ];
  
  for (const dbName of knownDbs) {
    try {
      const request = indexedDB.open(dbName);
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          request.result.close();
          databases.push(dbName);
          resolve(true);
        };
        request.onerror = () => {
          resolve(false); // Database doesn't exist
        };
      });
    } catch (error) {
      // Database doesn't exist
    }
  }
  
  return databases;
};
