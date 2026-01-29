/**
 * Diagnostic utilities for investigating Call Pay data issues
 * These functions can be called from the browser console for debugging
 */

import { getDataService } from '../../../services/DataService';
import { VariableDiscoveryService } from '../services/variableDiscoveryService';
import { DynamicAggregatedData } from '../types/variables';

// Dynamic import to avoid circular dependency
let AnalyticsDataService: any;

/**
 * Comprehensive diagnostic function to check Call Pay data in IndexedDB
 */
export async function diagnoseCallPayData() {
  console.log('🔍 ========================================');
  console.log('🔍 CALL PAY DATA DIAGNOSTIC');
  console.log('🔍 ========================================');
  
  const dataService = getDataService();
  
  try {
    // Step 1: Get all surveys
    console.log('\n📊 Step 1: Checking all surveys in IndexedDB...');
    const allSurveys = await dataService.getAllSurveys();
    console.log(`Found ${allSurveys.length} total surveys`);
    
    // Step 2: Filter for Call Pay surveys
    console.log('\n📊 Step 2: Filtering for Call Pay surveys...');
    const callPaySurveys = allSurveys.filter(survey => {
      const isCallPay = 
        survey.providerType === 'CALL' ||
        (survey as any).dataCategory === 'CALL_PAY' ||
        (survey.name && survey.name.toLowerCase().includes('call pay')) ||
        (survey.type && survey.type.toLowerCase().includes('call pay'));
      return isCallPay;
    });
    
    console.log(`Found ${callPaySurveys.length} Call Pay surveys:`, callPaySurveys.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      providerType: s.providerType,
      dataCategory: (s as any).dataCategory,
      source: (s as any).source,
      year: s.year,
      rowCount: s.rowCount
    })));
    
    if (callPaySurveys.length === 0) {
      console.warn('⚠️ No Call Pay surveys found in IndexedDB!');
      return { surveys: [], rawData: [], specialties: [] };
    }
    
    // Step 3: Check for MGMA Call Pay specifically
    console.log('\n📊 Step 3: Checking for MGMA Call Pay surveys...');
    const mgmaCallPaySurveys = callPaySurveys.filter(survey => {
      const name = (survey.name || survey.type || '').toLowerCase();
      const source = ((survey as any).source || '').toLowerCase();
      return name.includes('mgma') || source.includes('mgma');
    });
    
    console.log(`Found ${mgmaCallPaySurveys.length} MGMA Call Pay surveys:`, mgmaCallPaySurveys.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      providerType: s.providerType,
      dataCategory: (s as any).dataCategory
    })));
    
    // Step 4: Get raw survey data for MGMA Call Pay surveys
    console.log('\n📊 Step 4: Checking raw survey data...');
    const rawDataResults: any[] = [];
    
    for (const survey of mgmaCallPaySurveys) {
      try {
        const surveyData = await dataService.getSurveyData(survey.id, {}, { page: 1, pageSize: 100 });
        const rows = surveyData.rows || [];
        
        console.log(`\nSurvey "${survey.name}" (${survey.id}):`);
        console.log(`  - Total rows: ${rows.length}`);
        
        if (rows.length > 0) {
          // Check first row for column names
          const firstRow = rows[0];
          const columnNames = Object.keys(firstRow);
          console.log(`  - Column names (first ${Math.min(20, columnNames.length)}):`, columnNames.slice(0, 20));
          
          // Check for on-call compensation columns
          const onCallColumns = columnNames.filter(col => {
            const lower = col.toLowerCase();
            return lower.includes('call') || 
                   lower.includes('oncall') || 
                   lower.includes('on-call') ||
                   (lower.includes('daily') && lower.includes('rate'));
          });
          
          console.log(`  - On-Call related columns:`, onCallColumns);
          
          // Check for Pediatrics (general) specialty
          const specialtyColumns = columnNames.filter(col => {
            const lower = col.toLowerCase();
            return lower.includes('specialty') || lower.includes('provider type');
          });
          
          const pediatricsRows = rows.filter((row: any) => {
            const specialty = row.specialty || row.Specialty || row['Provider Type'] || '';
            return specialty.toLowerCase().includes('pediatric');
          });
          
          console.log(`  - Pediatrics rows: ${pediatricsRows.length}`);
          if (pediatricsRows.length > 0) {
            console.log(`  - Sample Pediatrics row:`, pediatricsRows[0]);
            
            // Check if this row has on-call data
            const sampleRow = pediatricsRows[0];
            const hasOnCallData = onCallColumns.some(col => {
              const value = sampleRow[col];
              return value !== null && value !== undefined && value !== '' && value !== 0;
            });
            console.log(`  - Has on-call data: ${hasOnCallData}`);
          }
          
          rawDataResults.push({
            surveyId: survey.id,
            surveyName: survey.name,
            rowCount: rows.length,
            columnNames,
            onCallColumns,
            pediatricsRows: pediatricsRows.length,
            sampleRow: rows[0]
          });
        }
      } catch (error) {
        console.error(`Error getting data for survey ${survey.name}:`, error);
      }
    }
    
    // Step 5: Check specialties
    console.log('\n📊 Step 5: Checking specialties in Call Pay data...');
    const specialties = new Set<string>();
    for (const survey of mgmaCallPaySurveys) {
      try {
        const surveyData = await dataService.getSurveyData(survey.id, {}, { page: 1, pageSize: 1000 });
        const rows = surveyData.rows || [];
        rows.forEach((row: any) => {
          const specialty = row.specialty || row.Specialty || row['Provider Type'] || '';
          if (specialty) specialties.add(specialty);
        });
      } catch (error) {
        console.error(`Error getting specialties for survey ${survey.name}:`, error);
      }
    }
    
    console.log(`Found ${specialties.size} unique specialties:`, Array.from(specialties).slice(0, 20));
    const hasPediatrics = Array.from(specialties).some(s => s.toLowerCase().includes('pediatric'));
    console.log(`Has Pediatrics: ${hasPediatrics}`);
    
    return {
      surveys: mgmaCallPaySurveys,
      rawData: rawDataResults,
      specialties: Array.from(specialties)
    };
    
  } catch (error) {
    console.error('❌ Error in diagnoseCallPayData:', error);
    throw error;
  }
}

/**
 * Check variable discovery for Call Pay variables
 */
export async function checkVariableDiscovery() {
  console.log('🔍 ========================================');
  console.log('🔍 VARIABLE DISCOVERY CHECK');
  console.log('🔍 ========================================');
  
  try {
    const service = VariableDiscoveryService.getInstance();
    
    // Check all variables
    console.log('\n📊 Discovering all variables...');
    const allVariables = await service.discoverAllVariables();
    console.log(`Found ${allVariables.length} total variables`);
    
    // Check Call Pay variables
    const callPayVariables = allVariables.filter(v => 
      v.normalizedName.includes('on_call') || 
      v.normalizedName.includes('oncall') ||
      v.name.toLowerCase().includes('call') ||
      v.name.toLowerCase().includes('on-call')
    );
    
    console.log(`\n📊 Found ${callPayVariables.length} Call Pay variables:`, callPayVariables.map(v => ({
      name: v.name,
      normalizedName: v.normalizedName,
      category: v.category,
      sources: v.availableSources,
      recordCount: v.recordCount
    })));
    
    // Check variables filtered by CALL_PAY category
    console.log('\n📊 Discovering variables filtered by CALL_PAY category...');
    const callPayCategoryVariables = await service.discoverAllVariables('CALL_PAY');
    console.log(`Found ${callPayCategoryVariables.length} variables in CALL_PAY category:`, 
      callPayCategoryVariables.map(v => v.normalizedName));
    
    // Check if on_call_compensation is discovered
    const onCallCompensation = allVariables.find(v => v.normalizedName === 'on_call_compensation');
    if (onCallCompensation) {
      console.log('\n✅ on_call_compensation variable found:', {
        name: onCallCompensation.name,
        normalizedName: onCallCompensation.normalizedName,
        sources: onCallCompensation.availableSources,
        recordCount: onCallCompensation.recordCount
      });
    } else {
      console.warn('\n⚠️ on_call_compensation variable NOT found in discovered variables!');
    }
    
    return {
      allVariables,
      callPayVariables,
      callPayCategoryVariables,
      onCallCompensation
    };
    
  } catch (error) {
    console.error('❌ Error in checkVariableDiscovery:', error);
    throw error;
  }
}

/**
 * Trace data flow through the entire pipeline for a specific specialty and survey source
 */
export async function checkDataFlow(specialty: string = 'Pediatrics (general)', surveySource: string = 'MGMA Call Pay') {
  console.log('🔍 ========================================');
  console.log('🔍 DATA FLOW TRACE');
  console.log('🔍 ========================================');
  console.log(`Specialty: ${specialty}`);
  console.log(`Survey Source: ${surveySource}`);
  
  try {
    // Dynamic import to avoid circular dependency
    if (!AnalyticsDataService) {
      const module = await import('../services/analyticsDataService');
      AnalyticsDataService = module.AnalyticsDataService;
    }
    const analyticsService = new AnalyticsDataService();
    
    // Step 1: Get raw analytics data (with reduced verbosity)
    console.log('\n📊 Step 1: Fetching raw analytics data...');
    console.log('   (This may take a moment. Normalization logs are suppressed for clarity.)');
    
    // Declare variables outside try block for use in later steps
    let rawData: DynamicAggregatedData[] = [];
    let allPediatricRows: DynamicAggregatedData[] = [];
    let filteredRows: DynamicAggregatedData[] = [];
    let pediatricSpecialties = new Set<string>();
    let hasOnCallData = false;
    
    // Temporarily suppress verbose console logs during data fetch
    const originalLog = console.log;
    const suppressedLogs: string[] = [];
    let logCount = 0;
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      // Suppress verbose normalization logs but keep important ones
      // Check for various normalization log patterns
      const shouldSuppress = 
        message.includes('🔍 MGMA Variable Processing') || 
        message.includes('🔍 On-Call Compensation detected') ||
        message.includes('🎯 MGMA Data Normalization') ||
        message.includes('🎯 Call Pay Data Normalization') ||
        message.includes('🔍 Survey Source Construction') ||
        message.includes('🔍 Applied learned variable mapping') ||
        message.includes('✅ MGMA CF Detected');
      
      if (shouldSuppress) {
        suppressedLogs.push(message);
        logCount++;
        // Only log every 50th message to show progress
        if (logCount % 50 === 0) {
          originalLog(`   ... processing (${logCount} normalization logs suppressed) ...`);
        }
        return; // Don't log suppressed messages
      } else {
        originalLog(...args);
      }
    };
    
    try {
      rawData = await analyticsService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: '',
        dataCategory: ''
      });
      
      // Restore console.log
      console.log = originalLog;
      
      console.log(`✅ Fetched ${rawData.length} total aggregated rows`);
      console.log(`   (Suppressed ${suppressedLogs.length} verbose normalization logs)`);
      
      // Step 2: Find ALL pediatric-related entries with MGMA Call Pay (for comparison)
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 STEP 2: Finding ALL pediatric-related entries with "${surveySource}"`);
      console.log(`${'='.repeat(60)}`);
      allPediatricRows = rawData.filter((row: DynamicAggregatedData) => {
        const rowSpecialty = (row.standardizedName || row.surveySpecialty || '').toLowerCase();
        const rowSource = (row.surveySource || '').toLowerCase();
        return rowSpecialty.includes('pediatric') && rowSource.includes(surveySource.toLowerCase());
      });
      
      console.log(`\n✅ Found ${allPediatricRows.length} pediatric-related rows with "${surveySource}"`);
      
      // Show all pediatric specialties found
      pediatricSpecialties.clear();
      allPediatricRows.forEach((row: DynamicAggregatedData) => {
        const specialty = row.standardizedName || row.surveySpecialty || '';
        pediatricSpecialties.add(specialty);
      });
      console.log(`\n📋 All Pediatric specialties found (${pediatricSpecialties.size} unique):`);
      Array.from(pediatricSpecialties).sort().forEach((s, i) => {
        console.log(`   ${i + 1}. ${s}`);
      });
      
      // Show sample rows
      if (allPediatricRows.length > 0) {
        console.log(`\n📋 Sample pediatric rows (first 5):`);
        allPediatricRows.slice(0, 5).forEach((row: DynamicAggregatedData, idx: number) => {
          console.log(`   Row ${idx + 1}:`, {
            specialty: row.standardizedName || row.surveySpecialty,
            surveySource: row.surveySource,
            region: row.geographicRegion,
            hasVariables: !!row.variables,
            variableCount: Object.keys(row.variables || {}).length,
            variableNames: Object.keys(row.variables || {}).slice(0, 5)
          });
        });
      }
      
      // Step 3: Filter for target specialty and survey source
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 STEP 3: Filtering for specialty="${specialty}" and surveySource="${surveySource}"`);
      console.log(`${'='.repeat(60)}`);
      filteredRows = rawData.filter((row: DynamicAggregatedData) => {
        const rowSpecialty = row.standardizedName || row.surveySpecialty || '';
        const rowSource = row.surveySource || '';
        const specialtyMatch = rowSpecialty.toLowerCase().includes(specialty.toLowerCase()) ||
                              specialty.toLowerCase().includes(rowSpecialty.toLowerCase());
        const sourceMatch = rowSource.toLowerCase().includes(surveySource.toLowerCase());
        return specialtyMatch && sourceMatch;
      });
      
      console.log(`\n✅ Found ${filteredRows.length} matching rows for "${specialty}" with "${surveySource}"`);
      
      if (filteredRows.length === 0) {
        console.log(`\n⚠️  NO ROWS FOUND! Checking why...`);
        console.log(`\n   Checking sample rows from all data to understand specialty naming:`);
        const sampleRows = rawData.slice(0, 20);
        const specialtyVariations = new Set<string>();
        sampleRows.forEach((r: DynamicAggregatedData) => {
          if (r.surveySource && r.surveySource.toLowerCase().includes(surveySource.toLowerCase())) {
            specialtyVariations.add(r.standardizedName || r.surveySpecialty || '');
          }
        });
        console.log(`   Found ${specialtyVariations.size} specialty name variations in ${surveySource} data:`);
        Array.from(specialtyVariations).sort().forEach((s, i) => {
          console.log(`     ${i + 1}. "${s}"`);
        });
        console.log(`\n   💡 Tip: Try matching with one of the specialty names above`);
      }
      
      // Step 4: Check variables in filtered rows
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 STEP 4: Checking variables in filtered rows`);
      console.log(`${'='.repeat(60)}`);
      
      if (filteredRows.length === 0) {
        console.log('\n⚠️  NO ROWS TO CHECK - Cannot analyze variables');
      } else {
        filteredRows.forEach((row: DynamicAggregatedData, index: number) => {
          const vars = row.variables || {};
          const allVarKeys = Object.keys(vars);
          
          console.log(`\n📋 Row ${index + 1} Details:`);
          console.log(`   Specialty: ${row.standardizedName || row.surveySpecialty || 'N/A'}`);
          console.log(`   Survey Source: ${row.surveySource || 'N/A'}`);
          console.log(`   Geographic Region: ${row.geographicRegion || 'N/A'}`);
          console.log(`   Provider Type: ${row.providerType || 'N/A'}`);
          console.log(`   Data Category: ${(row as any).dataCategory || 'N/A'}`);
          console.log(`   Total Variables: ${allVarKeys.length}`);
          console.log(`   Variable Names: [${allVarKeys.join(', ')}]`);
          
          const onCallVar = vars.on_call_compensation;
          console.log(`\n   🔍 on_call_compensation variable:`);
          if (onCallVar) {
            console.log(`      ✅ EXISTS`);
            console.log(`      n_orgs: ${onCallVar.n_orgs}`);
            console.log(`      n_incumbents: ${onCallVar.n_incumbents}`);
            console.log(`      p25: ${onCallVar.p25}`);
            console.log(`      p50: ${onCallVar.p50}`);
            console.log(`      p75: ${onCallVar.p75}`);
            console.log(`      p90: ${onCallVar.p90}`);
            console.log(`      Full Object:`, JSON.stringify(onCallVar, null, 2));
          } else {
            console.log(`      ❌ NOT FOUND`);
            console.log(`      Checking for alternative key names...`);
            const alternativeKeys = [
              'oncall_compensation',
              'daily_rate_on_call',
              'daily_rate_oncall',
              'daily_rate_on_call_compensation',
              'on_call_rate',
              'oncall_rate',
              'on_call'
            ];
            const foundAlternatives = alternativeKeys.filter(key => vars[key]);
            if (foundAlternatives.length > 0) {
              console.log(`      ⚠️  Found alternative keys: ${foundAlternatives.join(', ')}`);
              foundAlternatives.forEach(key => {
                console.log(`         ${key}:`, vars[key]);
              });
            } else {
              console.log(`      ❌ No alternative keys found either`);
            }
          }
        });
      }
    } catch (error) {
      // Restore console.log even on error
      console.log = originalLog;
      throw error;
    }
    
    // Step 5: Check if any pediatric rows have non-zero on-call data
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 STEP 5: Checking for non-zero on-call compensation in pediatric rows`);
    console.log(`${'='.repeat(60)}`);
    const pediatricRowsWithData = allPediatricRows.filter((row: DynamicAggregatedData) => {
      const vars = row.variables || {};
      return vars.on_call_compensation && vars.on_call_compensation.p50 > 0;
    });
    
    console.log(`\n✅ Found ${pediatricRowsWithData.length} pediatric rows with non-zero on-call compensation`);
    if (pediatricRowsWithData.length > 0) {
      console.log(`\n📋 Sample pediatric rows WITH data (first 5):`);
      pediatricRowsWithData.slice(0, 5).forEach((row: DynamicAggregatedData, idx: number) => {
        const onCallVar = row.variables?.on_call_compensation;
        console.log(`   Row ${idx + 1}: ${row.standardizedName || row.surveySpecialty}`);
        console.log(`      p50: ${onCallVar?.p50 || 'N/A'}`);
        console.log(`      n_orgs: ${onCallVar?.n_orgs || 'N/A'}`);
        console.log(`      n_incumbents: ${onCallVar?.n_incumbents || 'N/A'}`);
      });
    } else {
      console.log(`\n⚠️  NO pediatric rows found with non-zero on-call compensation values`);
      console.log(`   This suggests that all pediatric rows have p50 = 0 or missing data`);
    }
    
    hasOnCallData = filteredRows.some((row: DynamicAggregatedData) => {
      const vars = row.variables || {};
      return vars.on_call_compensation && vars.on_call_compensation.p50 > 0;
    });

    console.log(`\n✅ Has on_call_compensation data with values > 0 for "${specialty}": ${hasOnCallData}`);

    // Step 6: CRITICAL ANALYSIS - Why is "***" showing?
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 STEP 6: CRITICAL ANALYSIS - Why is "***" showing for "${specialty}"?`);
    console.log(`${'='.repeat(60)}`);
    
    if (filteredRows.length === 0) {
      console.log('\n❌ NO ROWS FOUND - Cannot analyze why "***" is showing');
      console.log('   This means the filtering is not finding any matching rows.');
      console.log('   Possible reasons:');
      console.log('   1. Specialty name mismatch (e.g., "Pediatrics (general)" vs "Pediatrics: General")');
      console.log('   2. Survey source name mismatch');
      console.log('   3. Data not loaded or normalized correctly');
      console.log('\n   💡 Check Step 2 output above to see all available pediatric specialties');
    } else {
      filteredRows.forEach((row: DynamicAggregatedData, index: number) => {
        const vars = row.variables || {};
        const allVarKeys = Object.keys(vars);
        
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`🔍 ROW ${index + 1} ANALYSIS: ${row.standardizedName || row.surveySpecialty || 'Unknown'}`);
        console.log(`${'─'.repeat(60)}`);
        
        // Check for on_call_compensation variable
        const onCallVar = vars.on_call_compensation;
        const hasOnCallVar = !!onCallVar;
        
        // Check alternative key variations
        const alternativeKeys = [
          'oncall_compensation',
          'daily_rate_on_call',
          'daily_rate_oncall',
          'daily_rate_on_call_compensation',
          'on_call_rate',
          'oncall_rate',
          'on_call'
        ];
        const foundAlternatives = alternativeKeys.filter(key => vars[key]);
        
        console.log(`\n📊 Variable Analysis:`);
        console.log(`   Has Variables Object: ${!!row.variables ? '✅ YES' : '❌ NO'}`);
        console.log(`   Total Variables: ${allVarKeys.length}`);
        console.log(`   All Variable Keys: [${allVarKeys.join(', ')}]`);
        console.log(`\n📊 on_call_compensation Variable:`);
        console.log(`   Exists: ${hasOnCallVar ? '✅ YES' : '❌ NO'}`);
        
        if (hasOnCallVar && onCallVar) {
          console.log(`\n   📈 Variable Values:`);
          console.log(`      n_orgs: ${onCallVar.n_orgs}`);
          console.log(`      n_incumbents: ${onCallVar.n_incumbents}`);
          console.log(`      p25: ${onCallVar.p25}`);
          console.log(`      p50: ${onCallVar.p50} ${onCallVar.p50 === 0 ? '⚠️ (ZERO!)' : ''}`);
          console.log(`      p75: ${onCallVar.p75}`);
          console.log(`      p90: ${onCallVar.p90}`);
          console.log(`\n   📋 Full Variable Object:`);
          console.log(JSON.stringify(onCallVar, null, 6));
          
          if (onCallVar.p50 === 0) {
            console.log(`\n   ⚠️  DIAGNOSIS: VARIABLE EXISTS BUT HAS ZERO VALUES`);
            console.log(`   ⚠️  → The formatter will convert p50=0 to "***"`);
            console.log(`   ⚠️  → This is the root cause of "***" appearing in the table`);
            console.log(`   💡 SOLUTION: The raw data for this specialty has zero values.`);
            console.log(`      Check the source CSV file to verify if this is correct data.`);
          } else {
            console.log(`\n   ✅ DIAGNOSIS: VARIABLE EXISTS WITH DATA`);
            console.log(`   ✅ → Should display normally in the table`);
            console.log(`   ✅ → If "***" is still showing, check the rendering logic.`);
          }
        } else {
          console.log(`\n   📋 Checking for alternative key names...`);
          if (foundAlternatives.length > 0) {
            console.log(`   ⚠️  Found alternative keys: ${foundAlternatives.join(', ')}`);
            foundAlternatives.forEach(key => {
              const altVar = vars[key];
              console.log(`\n   📊 Alternative Variable "${key}":`);
              console.log(`      n_orgs: ${altVar?.n_orgs || 'N/A'}`);
              console.log(`      n_incumbents: ${altVar?.n_incumbents || 'N/A'}`);
              console.log(`      p50: ${altVar?.p50 || 'N/A'}`);
              console.log(`      Full Object:`, JSON.stringify(altVar, null, 6));
            });
            console.log(`\n   ⚠️  DIAGNOSIS: VARIABLE NOT FOUND AS "on_call_compensation"`);
            console.log(`   ⚠️  → But found as: ${foundAlternatives.join(', ')}`);
            console.log(`   ⚠️  → This is a KEY MISMATCH issue`);
            console.log(`   💡 SOLUTION: The variable normalization is using a different key name.`);
            console.log(`      Check the variable normalization logic to map these keys correctly.`);
          } else {
            console.log(`   ❌ No alternative keys found either`);
            console.log(`\n   ❌ DIAGNOSIS: VARIABLE COMPLETELY MISSING`);
            console.log(`   ❌ → Will show "***" (no metrics object)`);
            console.log(`   💡 SOLUTION: Check why the variable is not being normalized/aggregated.`);
            console.log(`      Possible causes:`);
            console.log(`      1. Variable not discovered during normalization`);
            console.log(`      2. Variable filtered out during aggregation`);
            console.log(`      3. Variable name mismatch in raw data`);
          }
        }
      });
    }

    return {
      totalRows: rawData.length,
      filteredRows,
      hasOnCallData,
      allPediatricRows: allPediatricRows.length,
      pediatricSpecialties: Array.from(pediatricSpecialties)
    };
    
  } catch (error) {
    console.error('❌ Error in checkDataFlow:', error);
    throw error;
  }
}

/**
 * Check normalization for a specific survey
 */
export async function checkNormalization(surveyId: string) {
  console.log('🔍 ========================================');
  console.log('🔍 NORMALIZATION CHECK');
  console.log('🔍 ========================================');
  console.log(`Survey ID: ${surveyId}`);
  
  try {
    const dataService = getDataService();
    // Dynamic import to avoid circular dependency
    if (!AnalyticsDataService) {
      const module = await import('../services/analyticsDataService');
      AnalyticsDataService = module.AnalyticsDataService;
    }
    const analyticsService = new AnalyticsDataService();
    
    // Get survey
    const survey = await dataService.getSurveyById(surveyId);
    if (!survey) {
      console.error(`Survey ${surveyId} not found`);
      return;
    }
    
    console.log(`Survey: ${survey.name}`);
    console.log(`Provider Type: ${survey.providerType}`);
    console.log(`Data Category: ${(survey as any).dataCategory}`);
    
    // Get raw survey data
    const surveyData = await dataService.getSurveyData(surveyId, {}, { page: 1, pageSize: 10 });
    const rows = surveyData.rows || [];
    
    console.log(`\n📊 Sample raw data (first ${rows.length} rows):`);
    rows.slice(0, 3).forEach((row: any, index) => {
      console.log(`\nRow ${index + 1}:`, {
        keys: Object.keys(row),
        specialty: row.specialty || row.Specialty,
        variable: row.variable,
        onCallColumns: Object.keys(row).filter(k => 
          k.toLowerCase().includes('call') || 
          k.toLowerCase().includes('oncall')
        )
      });
    });
    
    // Get normalized data
    console.log(`\n📊 Getting normalized analytics data...`);
    const analyticsData = await analyticsService.getAnalyticsData({
      specialty: '',
      surveySource: survey.name || survey.type || '',
      geographicRegion: '',
      providerType: '',
      year: '',
      dataCategory: ''
    });
    
    const normalizedRows = analyticsData.filter((row: DynamicAggregatedData) => 
      row.surveySource === (survey.name || survey.type)
    );
    
    console.log(`Found ${normalizedRows.length} normalized rows for this survey`);
    normalizedRows.slice(0, 3).forEach((row: DynamicAggregatedData, index: number) => {
      console.log(`\nNormalized Row ${index + 1}:`, {
        specialty: row.standardizedName,
        surveySource: row.surveySource,
        variableKeys: Object.keys((row as any).variables || {}),
        onCallCompensation: (row as any).variables?.on_call_compensation
      });
    });
    
    return {
      survey,
      rawRows: rows,
      normalizedRows
    };
    
  } catch (error) {
    console.error('❌ Error in checkNormalization:', error);
    throw error;
  }
}

/**
 * Check raw IndexedDB data for "Pediatrics (general)" in MGMA Call Pay
 */
export async function checkRawDataForPediatrics() {
  console.log('🔍 ========================================');
  console.log('🔍 RAW DATA CHECK - Pediatrics (general) + MGMA Call Pay');
  console.log('🔍 ========================================');
  
  try {
    const dataService = getDataService();
    const allSurveys = await dataService.getAllSurveys();
    const mgmaCallPaySurvey = allSurveys.find(s => 
      s.name?.toLowerCase().includes('mgma') && 
      s.name?.toLowerCase().includes('call pay')
    );
    
    if (!mgmaCallPaySurvey) {
      console.warn('⚠️ No MGMA Call Pay survey found');
      return;
    }
    
    console.log(`\n📊 Found MGMA Call Pay survey: ${mgmaCallPaySurvey.name} (${mgmaCallPaySurvey.id})`);
    
    // Get ALL raw data from this survey
    const surveyData = await dataService.getSurveyData(mgmaCallPaySurvey.id, {}, { page: 1, pageSize: 10000 });
    const rows = surveyData.rows || [];
    
    console.log(`\n📊 Total raw rows in survey: ${rows.length}`);
    
    // Filter for Pediatrics (general) rows
    const pediatricRows = rows.filter((row: any) => {
      const specialty = row.specialty || row.Specialty || row['Provider Type'] || '';
      return specialty.toLowerCase().includes('pediatric') && 
             (specialty.toLowerCase().includes('general') || specialty.toLowerCase() === 'pediatrics: general');
    });
    
    console.log(`\n📊 Found ${pediatricRows.length} raw rows matching "Pediatrics (general)"`);
    
    if (pediatricRows.length === 0) {
      console.warn('⚠️ NO raw rows found for "Pediatrics (general)"!');
      console.log('\n📋 Checking all pediatric specialties in raw data:');
      const allPediatricRows = rows.filter((row: any) => {
        const specialty = row.specialty || row.Specialty || row['Provider Type'] || '';
        return specialty.toLowerCase().includes('pediatric');
      });
      const specialties = new Set<string>();
      allPediatricRows.forEach((row: any) => {
        const specialty = row.specialty || row.Specialty || row['Provider Type'] || '';
        if (specialty) specialties.add(specialty);
      });
      console.log(`Found ${specialties.size} pediatric specialties:`, Array.from(specialties).sort());
      return;
    }
    
    // Check first few rows
    console.log(`\n📋 Sample raw rows (first ${Math.min(5, pediatricRows.length)}):`);
    pediatricRows.slice(0, 5).forEach((row: any, index: number) => {
      const rowData = row.data || row;
      console.log(`\n🔍 Raw Row ${index + 1}:`, {
        specialty: rowData.specialty || rowData.Specialty || rowData['Provider Type'],
        variable: rowData.variable || rowData.Variable || rowData['Variable Name'],
        hasVariableField: rowData.variable !== undefined,
        p25: rowData.p25,
        p50: rowData.p50,
        p75: rowData.p75,
        p90: rowData.p90,
        n_orgs: rowData.n_orgs,
        n_incumbents: rowData.n_incumbents,
        allKeys: Object.keys(rowData).slice(0, 30),
        isCallPayVariable: rowData.variable?.toLowerCase().includes('call') || 
                          rowData.variable?.toLowerCase().includes('on-call') ||
                          rowData.variable?.toLowerCase().includes('oncall')
      });
    });
    
    // Check if any rows have on-call variable
    const rowsWithCallPayVar = pediatricRows.filter((row: any) => {
      const rowData = row.data || row;
      const variable = rowData.variable || '';
      return variable.toLowerCase().includes('call') || 
             variable.toLowerCase().includes('on-call') ||
             variable.toLowerCase().includes('oncall');
    });
    
    console.log(`\n📊 Rows with Call Pay variable: ${rowsWithCallPayVar.length} out of ${pediatricRows.length}`);
    
    if (rowsWithCallPayVar.length > 0) {
      console.log('\n✅ Found raw rows with Call Pay variable!');
      rowsWithCallPayVar.slice(0, 3).forEach((row: any, index: number) => {
        const rowData = row.data || row;
        console.log(`\n   Row ${index + 1}:`, {
          specialty: rowData.specialty,
          variable: rowData.variable,
          p50: rowData.p50,
          n_orgs: rowData.n_orgs,
          n_incumbents: rowData.n_incumbents
        });
      });
    } else {
      console.warn('\n⚠️ NO raw rows found with Call Pay variable for "Pediatrics (general)"');
      console.log('   This suggests the raw data itself may not have this variable for this specialty');
    }
    
    return {
      survey: mgmaCallPaySurvey,
      totalRows: rows.length,
      pediatricRows: pediatricRows.length,
      rowsWithCallPayVar: rowsWithCallPayVar.length,
      sampleRows: pediatricRows.slice(0, 5)
    };
    
  } catch (error) {
    console.error('❌ Error in checkRawDataForPediatrics:', error);
    throw error;
  }
}

/**
 * Quick diagnostic to check specific rows in the table
 */
export async function checkTableRows() {
  console.log('🔍 ========================================');
  console.log('🔍 TABLE ROWS CHECK');
  console.log('🔍 ========================================');
  
  try {
    // Get all surveys to find Call Pay survey ID
    const dataService = getDataService();
    const allSurveys = await dataService.getAllSurveys();
    const callPaySurvey = allSurveys.find(s => 
      s.providerType === 'CALL' || 
      (s as any).dataCategory === 'CALL_PAY' ||
      (s.name && s.name.toLowerCase().includes('call pay'))
    );
    
    if (!callPaySurvey) {
      console.warn('⚠️ No Call Pay survey found');
      return;
    }
    
    console.log(`Found Call Pay survey: ${callPaySurvey.name} (${callPaySurvey.id})`);
    
    // Get analytics data service
    if (!AnalyticsDataService) {
      const module = await import('../services/analyticsDataService');
      AnalyticsDataService = module.AnalyticsDataService;
    }
    const analyticsService = new AnalyticsDataService();
    
    // Get all analytics data
    const allData = await analyticsService.getAnalyticsData({
      specialty: '',
      surveySource: '',
      geographicRegion: '',
      providerType: '',
      year: '',
      dataCategory: ''
    });
    
    // Filter for Pediatrics (general) and MGMA Call Pay
    const pediatricsCallPay = allData.filter((row: DynamicAggregatedData) => {
      const specialty = (row.standardizedName || row.surveySpecialty || '').toLowerCase();
      const source = (row.surveySource || '').toLowerCase();
      return specialty.includes('pediatric') && source.includes('mgma') && source.includes('call');
    });
    
    console.log(`\n📊 Found ${pediatricsCallPay.length} rows for Pediatrics with MGMA Call Pay:`);
    
    pediatricsCallPay.slice(0, 5).forEach((row: DynamicAggregatedData, index: number) => {
      console.log(`\nRow ${index + 1}:`, {
        specialty: row.standardizedName,
        surveySource: row.surveySource,
        region: row.geographicRegion,
        providerType: row.providerType,
        dataCategory: (row as any).dataCategory,
        allVariableKeys: Object.keys(row.variables || {}),
        hasOnCallCompensation: !!(row.variables || {})['on_call_compensation'],
        onCallCompensation: (row.variables || {})['on_call_compensation'],
        variablesObject: row.variables
      });
    });
    
    return {
      callPaySurvey,
      pediatricsCallPayRows: pediatricsCallPay
    };
    
  } catch (error) {
    console.error('❌ Error in checkTableRows:', error);
    throw error;
  }
}

/**
 * Setup global diagnostic functions on window object
 */
export function setupDiagnostics() {
  if (typeof window !== 'undefined') {
    (window as any).diagnoseCallPayData = diagnoseCallPayData;
    (window as any).checkVariableDiscovery = checkVariableDiscovery;
    (window as any).checkDataFlow = checkDataFlow;
    (window as any).checkNormalization = checkNormalization;
    (window as any).checkTableRows = checkTableRows;
    (window as any).checkRawDataForPediatrics = checkRawDataForPediatrics;
    
    console.log('✅ Diagnostic functions available:');
    console.log('  - window.diagnoseCallPayData() - Check all Call Pay data in IndexedDB');
    console.log('  - window.checkVariableDiscovery() - Check variable discovery results');
    console.log('  - window.checkDataFlow(specialty, surveySource) - Trace data through pipeline');
    console.log('  - window.checkNormalization(surveyId) - Check normalization for specific survey');
    console.log('  - window.checkTableRows() - Check actual table rows for Pediatrics + MGMA Call Pay');
    console.log('  - window.checkRawDataForPediatrics() - Check raw IndexedDB data for Pediatrics (general)');
  }
}

