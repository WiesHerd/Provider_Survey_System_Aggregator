/**
 * Migration Script: Convert existing survey data to normalized format
 * 
 * This script:
 * 1. Reads existing survey_data table
 * 2. Converts wide format to normalized format
 * 3. Inserts into new survey_data_normalized table
 * 4. Provides statistics and validation
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { normalizeData, validateRow, getNormalizationStats } = require('./utils/dataNormalizer');

const dbPath = path.join(__dirname, 'survey_data.db');
const db = new sqlite3.Database(dbPath);

/**
 * Migrate all existing survey data to normalized format
 */
async function migrateToNormalized() {
  console.log('🚀 Starting migration to normalized data structure...');
  
  try {
    // Get all surveys
    const surveys = await getSurveys();
    console.log(`📊 Found ${surveys.length} surveys to migrate`);
    
    let totalOriginalRows = 0;
    let totalNormalizedRows = 0;
    let migrationStats = [];
    
    for (const survey of surveys) {
      console.log(`\n📋 Migrating survey: ${survey.name} (${survey.id})`);
      
      // Get survey data
      const surveyData = await getSurveyData(survey.id);
      console.log(`   Found ${surveyData.length} original rows`);
      
      if (surveyData.length === 0) {
        console.log(`   ⚠️  No data found for survey ${survey.id}, skipping...`);
        continue;
      }
      
      // Convert to normalized format
      const normalizedData = normalizeData(surveyData, survey.id);
      console.log(`   Generated ${normalizedData.length} normalized rows`);
      
      // Validate data
      const validRows = surveyData.filter(validateRow);
      const invalidRows = surveyData.length - validRows.length;
      
      if (invalidRows > 0) {
        console.log(`   ⚠️  ${invalidRows} invalid rows found (missing required fields)`);
      }
      
      // Insert normalized data
      const insertedRows = await insertNormalizedData(normalizedData);
      console.log(`   ✅ Inserted ${insertedRows} normalized rows`);
      
      // Update survey metadata
      await updateSurveyMetadata(survey.id, {
        originalRowCount: surveyData.length,
        normalizedRowCount: insertedRows,
        migrationDate: new Date().toISOString()
      });
      
      // Collect stats
      const stats = getNormalizationStats(surveyData, normalizedData);
      migrationStats.push({
        surveyId: survey.id,
        surveyName: survey.name,
        ...stats
      });
      
      totalOriginalRows += surveyData.length;
      totalNormalizedRows += insertedRows;
    }
    
    // Print final statistics
    console.log('\n📈 Migration Statistics:');
    console.log('========================');
    console.log(`Total Surveys: ${surveys.length}`);
    console.log(`Total Original Rows: ${totalOriginalRows}`);
    console.log(`Total Normalized Rows: ${totalNormalizedRows}`);
    console.log(`Average Expansion Factor: ${(totalNormalizedRows / totalOriginalRows).toFixed(2)}x`);
    
    console.log('\n📊 Per-Survey Statistics:');
    migrationStats.forEach(stat => {
      console.log(`  ${stat.surveyName}:`);
      console.log(`    Original: ${stat.totalOriginalRows} → Normalized: ${stat.totalNormalizedRows} (${stat.expansionFactor.toFixed(2)}x)`);
      console.log(`    Variables: ${JSON.stringify(stat.variableCounts)}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Get all surveys from the database
 */
function getSurveys() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name, type, year FROM surveys ORDER BY uploadDate', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Get survey data for a specific survey
 */
function getSurveyData(surveyId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM survey_data WHERE surveyId = ?', [surveyId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Insert normalized data into the new table
 */
function insertNormalizedData(normalizedData) {
  return new Promise((resolve, reject) => {
    if (normalizedData.length === 0) {
      resolve(0);
      return;
    }
    
    const placeholders = normalizedData.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = normalizedData.flatMap(row => [
      row.id,
      row.surveyId,
      row.specialty,
      row.providerType,
      row.geographicRegion,
      row.variable,
      row.n_orgs,
      row.n_incumbents,
      row.p25,
      row.p50,
      row.p75,
      row.p90,
      row.originalData
    ]);
    
    const query = `
      INSERT INTO survey_data_normalized 
      (id, surveyId, specialty, providerType, geographicRegion, variable, n_orgs, n_incumbents, p25, p50, p75, p90, originalData)
      VALUES ${placeholders}
    `;
    
    db.run(query, values, function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

/**
 * Update survey metadata with migration information
 */
function updateSurveyMetadata(surveyId, metadata) {
  return new Promise((resolve, reject) => {
    const currentMetadata = JSON.parse(metadata || '{}');
    const updatedMetadata = JSON.stringify({
      ...currentMetadata,
      migration: metadata
    });
    
    db.run('UPDATE surveys SET metadata = ? WHERE id = ?', [updatedMetadata, surveyId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Verify migration by comparing row counts
 */
function verifyMigration() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        s.id,
        s.name,
        s.rowCount as originalRowCount,
        COUNT(sdn.id) as normalizedRowCount
      FROM surveys s
      LEFT JOIN survey_data_normalized sdn ON s.id = sdn.surveyId
      GROUP BY s.id, s.name, s.rowCount
      ORDER BY s.name
    `;
    
    db.all(query, (err, rows) => {
      if (err) reject(err);
      else {
        console.log('\n🔍 Migration Verification:');
        console.log('========================');
        rows.forEach(row => {
          const expectedNormalized = row.originalRowCount * 3; // Each row becomes 3 rows (TCC, wRVU, CF)
          const actualNormalized = row.normalizedRowCount;
          const status = actualNormalized >= expectedNormalized ? '✅' : '❌';
          console.log(`${status} ${row.name}: ${row.originalRowCount} → ${actualNormalized} (expected ~${expectedNormalized})`);
        });
        resolve(rows);
      }
    });
  });
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateToNormalized()
    .then(() => verifyMigration())
    .then(() => {
      console.log('\n🎉 Migration and verification completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateToNormalized,
  verifyMigration
};
