/**
 * Utility to clear storage and resolve quota exceeded errors
 */

export const clearStorage = {
  /**
   * Clear app-scoped localStorage data only
   */
  clearLocalStorage: () => {
    try {
      const exactKeys = new Set([
        'customReports',
        'enhancedCustomReports',
        'uploadFormDefaults',
        'upload_checkpoints',
        'upload_metrics',
        'auditLogs',
        'errorLogs',
        'errorAggregations',
        'localUserId',
        'welcomeBannerDismissed',
        'app_specialty_mappings',
        'year_configs',
        'mapping.learnedInfoDismissed.v1'
      ]);

      const prefixKeys = [
        'preference_',
        'reportConfig_',
        'year_data_'
      ];

      let removedCount = 0;

      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (!key) continue;

        const shouldRemove = exactKeys.has(key) || prefixKeys.some(prefix => key.startsWith(prefix));
        if (shouldRemove) {
          localStorage.removeItem(key);
          removedCount += 1;
        }
      }

      console.log(`localStorage cleared successfully (${removedCount} app keys removed)`);
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },

  /**
   * Clear specific year data from localStorage
   */
  clearYearData: (year: string) => {
    try {
      const keysToRemove: string[] = [];
      
      // Find all keys related to the specified year
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(`year_data_${year}`)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove the keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removed: ${key}`);
      });
      
      console.log(`Cleared ${keysToRemove.length} items for year ${year}`);
      return true;
    } catch (error) {
      console.error('Error clearing year data:', error);
      return false;
    }
  },

  /**
   * Clear IndexedDB data
   */
  clearIndexedDB: async () => {
    try {
      const dbName = 'SurveyAggregatorDB';
      const request = indexedDB.deleteDatabase(dbName);
      
      return new Promise<boolean>((resolve) => {
        request.onerror = () => {
          console.error('Error deleting IndexedDB:', request.error);
          resolve(false);
        };
        
        request.onsuccess = () => {
          console.log('IndexedDB cleared successfully');
          resolve(true);
        };
      });
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      return false;
    }
  },
  /**
   * Clear Firebase Auth persistence only (safe for app data)
   */
  clearFirebaseAuthStorage: async () => {
    try {
      let removedCount = 0;
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('firebase:') || key.startsWith('firebaseui::')) {
          localStorage.removeItem(key);
          removedCount += 1;
        }
      }

      const dbName = 'firebaseLocalStorageDb';
      const request = indexedDB.deleteDatabase(dbName);

      return await new Promise<boolean>((resolve) => {
        request.onerror = () => {
          console.error('Error deleting Firebase Auth IndexedDB:', request.error);
          resolve(false);
        };
        request.onsuccess = () => {
          console.log(`Firebase Auth storage cleared (${removedCount} keys removed)`);
          resolve(true);
        };
      });
    } catch (error) {
      console.error('Error clearing Firebase Auth storage:', error);
      return false;
    }
  },

  /**
   * Get storage usage information
   */
  getStorageUsage: () => {
    try {
      let totalSize = 0;
      const items: { key: string; size: number }[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          const size = value ? value.length : 0;
          totalSize += size;
          items.push({ key, size });
        }
      }
      
      return {
        totalSize,
        itemCount: items.length,
        items: items.sort((a, b) => b.size - a.size) // Sort by size descending
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { totalSize: 0, itemCount: 0, items: [] };
    }
  },

  /**
   * Clear all storage (localStorage + IndexedDB)
   */
  clearAll: async () => {
    console.log('Clearing all storage...');
    
    const localStorageCleared = clearStorage.clearLocalStorage();
    const indexedDBCleared = await clearStorage.clearIndexedDB();
    
    if (localStorageCleared && indexedDBCleared) {
      console.log('All storage cleared successfully');
      return true;
    } else {
      console.log('Some storage clearing failed');
      return false;
    }
  }
};

/**
 * Quick fix for quota exceeded error
 */
export const fixQuotaError = async () => {
  console.log('Attempting to fix quota exceeded error...');
  
  // First, try to clear year-specific data
  const yearService = new (await import('../services/YearManagementService')).YearManagementService();
  
  try {
    // Clear year 2024 data specifically
    await yearService.clearYearData('2024');
    console.log('Cleared 2024 year data');
    
    // Also clear localStorage year data
    clearStorage.clearYearData('2024');
    
    return true;
  } catch (error) {
    console.error('Error fixing quota error:', error);
    
    // If that fails, clear everything
    try {
      await clearStorage.clearAll();
      return true;
    } catch (clearError) {
      console.error('Error clearing all storage:', clearError);
      return false;
    }
  }
};
