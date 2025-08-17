const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('survey_data.db');

console.log('Checking surveys in database...');

db.all("SELECT id, name, type, year, rowCount FROM surveys", (err, rows) => {
  if (err) {
    console.error('Error checking surveys:', err);
  } else {
    console.log('Surveys found:', rows.length);
    if (rows.length > 0) {
      console.log('Survey details:');
      rows.forEach(survey => {
        console.log(`- ID: ${survey.id}, Name: ${survey.name}, Type: ${survey.type}, Year: ${survey.year}, Rows: ${survey.rowCount}`);
      });
    } else {
      console.log('No surveys found in database');
    }
  }
  
  db.close();
});
