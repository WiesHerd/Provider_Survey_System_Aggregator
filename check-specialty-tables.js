const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('survey_data.db');

console.log('Checking specialty mapping tables...');

db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%specialty%'", (err, rows) => {
  if (err) {
    console.error('Error checking tables:', err);
  } else {
    console.log('Specialty tables found:', rows);
    
    if (rows.length === 0) {
      console.log('No specialty tables found! This is likely the cause of the auto-mapping failure.');
    } else {
      // Check if the tables have data
      rows.forEach(table => {
        db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, result) => {
          if (err) {
            console.error(`Error checking ${table.name}:`, err);
          } else {
            console.log(`${table.name}: ${result.count} rows`);
          }
        });
      });
    }
  }
  
  db.close();
});
