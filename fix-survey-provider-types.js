// Fix Survey Provider Types
// This script re-runs the migration service to fix incorrect provider type assignments

import { SurveyMigrationService } from './src/services/SurveyMigrationService.ts';

console.log('🔧 Starting survey provider type migration...');

const migrationService = SurveyMigrationService.getInstance();

try {
  await migrationService.migrateSurveys();
  console.log('✅ Survey provider type migration completed successfully');
} catch (error) {
  console.error('❌ Error during migration:', error);
}