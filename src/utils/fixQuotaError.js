/**
 * Quick fix for quota exceeded error
 * Run this in your browser console to clear storage and fix the upload issue
 */

console.log('🔧 Fixing quota exceeded error...');

// Clear localStorage
try {
  localStorage.clear();
  console.log('✅ localStorage cleared');
} catch (error) {
  console.error('❌ Error clearing localStorage:', error);
}

// Clear IndexedDB
try {
  const request = indexedDB.deleteDatabase('SurveyAggregatorDB');
  request.onerror = () => {
    console.error('❌ Error deleting IndexedDB:', request.error);
  };
  request.onsuccess = () => {
    console.log('✅ IndexedDB cleared');
  };
} catch (error) {
  console.error('❌ Error clearing IndexedDB:', error);
}

// Clear year-specific data from localStorage
try {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('year_data_2024')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Removed: ${key}`);
  });
  
  console.log(`✅ Cleared ${keysToRemove.length} year data items`);
} catch (error) {
  console.error('❌ Error clearing year data:', error);
}

console.log('🎉 Storage cleared! Try uploading your surveys again.');
console.log('💡 If you still get errors, refresh the page and try again.');
