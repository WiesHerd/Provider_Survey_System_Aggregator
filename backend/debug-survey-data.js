const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'survey_data.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Debugging Survey Data...\n');

// Check surveys table
db.all("SELECT * FROM surveys", [], (err, rows) => {
  if (err) {
    console.error('❌ Error querying surveys:', err);
    return;
  }
  
  console.log('📋 Surveys in database:');
  rows.forEach(row => {
    console.log(`- ID: ${row.id}`);
    console.log(`  Survey Provider: ${row.surveyProvider}`);
    console.log(`  Survey Year: ${row.surveyYear}`);
    console.log(`  Upload Date: ${row.uploadDate}`);
    console.log(`  File Name: ${row.fileName}`);
    console.log('');
  });
  
  // Check survey data
  if (rows.length > 0) {
    const firstSurveyId = rows[0].id;
    console.log(`📊 Checking data for survey: ${firstSurveyId}`);
    
    db.all("SELECT COUNT(*) as count FROM survey_data WHERE surveyId = ?", [firstSurveyId], (err, countRows) => {
      if (err) {
        console.error('❌ Error counting survey data:', err);
        return;
      }
      
      console.log(`✅ Survey data count: ${countRows[0].count} rows`);
      
      // Check sample data
      db.all("SELECT * FROM survey_data WHERE surveyId = ? LIMIT 3", [firstSurveyId], (err, sampleRows) => {
        if (err) {
          console.error('❌ Error getting sample data:', err);
          return;
        }
        
        console.log('📋 Sample survey data:');
        sampleRows.forEach(row => {
          console.log(`- Raw data keys: ${Object.keys(JSON.parse(row.rawData))}`);
          const data = JSON.parse(row.rawData);
          console.log(`  Specialty: ${data.specialty}`);
          console.log(`  TCC P50: ${data.tcc_p50}`);
          console.log('');
        });
        
        db.close();
      });
    });
  } else {
    console.log('❌ No surveys found in database');
    db.close();
  }
});
