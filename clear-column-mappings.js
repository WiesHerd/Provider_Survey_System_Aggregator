/**
 * Script to clear all existing column mappings
 * This will fix the data structure issue where sourceColumns contain survey sources instead of actual column names
 */

// Clear all column mappings from IndexedDB
async function clearColumnMappings() {
  try {
    console.log('🧹 Clearing all column mappings...');
    
    // Open IndexedDB
    const request = indexedDB.open('SurveyAggregatorDB', 6);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['columnMappings'], 'readwrite');
      const store = transaction.objectStore('columnMappings');
      
      // Get all mappings first to log them
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const mappings = getAllRequest.result;
        console.log(`📋 Found ${mappings.length} column mappings to clear`);
        
        if (mappings.length === 0) {
          console.log(`✅ No column mappings found`);
          return;
        }
        
        // Log what we're about to delete
        mappings.forEach(mapping => {
          console.log(`🗑️ Will delete mapping: ${mapping.standardizedName}`);
          console.log(`   Source columns:`, mapping.sourceColumns.map(col => ({
            name: col.name,
            surveySource: col.surveySource
          })));
        });
        
        // Clear all mappings
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          console.log(`✅ Successfully cleared ${mappings.length} column mappings`);
          console.log(`🎉 Column mappings cleared! You can now recreate them with the correct data structure.`);
        };
        clearRequest.onerror = () => {
          console.error(`❌ Failed to clear column mappings`);
        };
      };
      
      getAllRequest.onerror = () => {
        console.error(`❌ Failed to get column mappings`);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Failed to open IndexedDB');
    };
    
  } catch (error) {
    console.error('❌ Error clearing column mappings:', error);
  }
}

// Run the script
clearColumnMappings();
