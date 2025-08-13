const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'survey_data.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking Survey Data Table...\n');

// Check table structure
db.all("PRAGMA table_info('survey_data')", [], (err, columns) => {
  if (err) {
    console.error('❌ Error checking table structure:', err);
    return;
  }
  
  console.log('📋 Survey Data Table Structure:');
  columns.forEach(col => {
    console.log(`- ${col.name}: ${col.type}`);
  });
  console.log('');
  
  // Check if there's any data
  db.get("SELECT COUNT(*) as count FROM survey_data", [], (err, countRow) => {
    if (err) {
      console.error('❌ Error counting data:', err);
      return;
    }
    
    console.log(`📊 Total rows in survey_data: ${countRow.count}`);
    
    if (countRow.count > 0) {
      // Get sample data
      db.all("SELECT * FROM survey_data LIMIT 3", [], (err, sampleRows) => {
        if (err) {
          console.error('❌ Error getting sample data:', err);
          return;
        }
        
        console.log('\n📋 Sample survey_data rows:');
        sampleRows.forEach((row, index) => {
          console.log(`\nRow ${index + 1}:`);
          console.log(`- ID: ${row.id}`);
          console.log(`- Survey ID: ${row.surveyId}`);
          console.log(`- Specialty: ${row.specialty}`);
          console.log(`- Provider Type: ${row.providerType}`);
          console.log(`- Region: ${row.region}`);
          console.log(`- TCC: ${row.tcc}`);
          console.log(`- CF: ${row.cf}`);
          console.log(`- WRVU: ${row.wrvu}`);
          console.log(`- Count: ${row.count}`);
          
          // Check if there's a data column
          if (row.data) {
            try {
              const parsedData = JSON.parse(row.data);
              console.log(`- Data keys: ${Object.keys(parsedData)}`);
              console.log(`- Sample data:`, parsedData);
            } catch (e) {
              console.log(`- Data (raw): ${row.data}`);
            }
          } else {
            console.log(`- Data: undefined`);
          }
        });
        
        db.close();
      });
    } else {
      console.log('❌ No data found in survey_data table');
      db.close();
    }
  });
});
