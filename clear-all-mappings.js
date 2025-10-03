// Clear All Mappings Script
// This script will clear ALL specialty mappings from IndexedDB

console.log('🧹 Starting to clear all specialty mappings...');

// Import the DataService
import('./src/services/DataService.js').then(async (module) => {
  try {
    const { DataService } = module;
    const dataService = new DataService();
    
    console.log('📋 Clearing all specialty mappings...');
    await dataService.clearAllSpecialtyMappings();
    
    console.log('✅ Successfully cleared all specialty mappings!');
    console.log('🔄 Please refresh the specialty mapping page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error clearing mappings:', error);
  }
}).catch(error => {
  console.error('❌ Failed to import DataService:', error);
  console.log('💡 Try running this in the browser console instead:');
  console.log(`
    // Run this in the browser console:
    import('./src/services/DataService.js').then(async (module) => {
      const { DataService } = module;
      const dataService = new DataService();
      await dataService.clearAllSpecialtyMappings();
      console.log('✅ Cleared all mappings!');
    });
  `);
});
