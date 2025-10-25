const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('survey_data.db');

console.log('🗑️ Clearing all data from database...');

// Clear all data in the correct order
db.serialize(() => {
  // First, clear specialty mappings
  db.run('DELETE FROM specialty_mapping_sources_v2', function(err) {
    if (err) {
      console.error('❌ Error clearing specialty_mapping_sources_v2:', err);
    } else {
      console.log('✅ Cleared specialty_mapping_sources_v2');
    }
  });
  
  db.run('DELETE FROM specialty_mappings_v2', function(err) {
    if (err) {
      console.error('❌ Error clearing specialty_mappings_v2:', err);
    } else {
      console.log('✅ Cleared specialty_mappings_v2');
    }
  });
  
  // Then clear survey data
  db.run('DELETE FROM survey_data', function(err) {
    if (err) {
      console.error('❌ Error clearing survey_data:', err);
    } else {
      console.log('✅ Cleared survey_data');
    }
  });
  
  // Finally clear surveys
  db.run('DELETE FROM surveys', function(err) {
    if (err) {
      console.error('❌ Error clearing surveys:', err);
    } else {
      console.log('✅ Cleared surveys');
    }
    
    // Check what's left
    db.all("SELECT COUNT(*) as count FROM surveys", (err, rows) => {
      if (err) {
        console.error('❌ Error checking surveys:', err);
      } else {
        console.log(`📊 Surveys remaining: ${rows[0].count}`);
      }
      
      db.all("SELECT COUNT(*) as count FROM specialty_mappings_v2", (err, rows) => {
        if (err) {
          console.error('❌ Error checking specialty mappings:', err);
        } else {
          console.log(`📊 Specialty mappings remaining: ${rows[0].count}`);
        }
        
        console.log('🎯 Database cleared successfully!');
        db.close();
      });
    });
  });
});
