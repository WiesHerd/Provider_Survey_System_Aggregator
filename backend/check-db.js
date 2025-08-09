const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'survey_data.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database contents...\n');

// Check surveys table
db.all('SELECT * FROM surveys ORDER BY uploadDate DESC', (err, rows) => {
  if (err) {
    console.error('Error fetching surveys:', err);
    return;
  }
  console.log('📊 Surveys table (most recent first):');
  console.log(JSON.stringify(rows, null, 2));
  console.log('\n');
  
  if (rows.length > 0) {
    const mostRecentSurveyId = rows[0].id;
    console.log(`🔍 Checking data for most recent survey: ${mostRecentSurveyId}\n`);
    
    // Check survey data table for the most recent survey
    db.all('SELECT * FROM survey_data WHERE surveyId = ? LIMIT 5', [mostRecentSurveyId], (err, dataRows) => {
      if (err) {
        console.error('Error fetching survey data:', err);
        return;
      }
      console.log('📋 Survey data table (first 5 rows from most recent survey):');
      console.log(JSON.stringify(dataRows, null, 2));
      
      db.close();
    });
  } else {
    console.log('No surveys found in database');
    db.close();
  }
});
