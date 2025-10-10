// Script to clear IndexedDB and force fresh initialization
// Run this in the browser console to fix the blendTemplates store issue

console.log('🗑️ Clearing IndexedDB...');

// Clear the existing database
const deleteRequest = indexedDB.deleteDatabase('SurveyAggregatorDB');

deleteRequest.onsuccess = () => {
  console.log('✅ IndexedDB cleared successfully');
  console.log('🔄 Please refresh the page to reinitialize the database with the new schema');
  console.log('📝 The blendTemplates store will be created automatically');
};

deleteRequest.onerror = () => {
  console.error('❌ Error clearing IndexedDB:', deleteRequest.error);
};

deleteRequest.onblocked = () => {
  console.log('⚠️ Database is blocked. Please close all tabs with this app and try again.');
};