/**
 * Analytics Feature - Diagnostic Utilities
 * 
 * Tools for diagnosing data processing issues, especially for MGMA CF detection
 */

import { getDataService } from '../../../services/DataService';

/**
 * Diagnostic tool to check MGMA data processing
 */
export const diagnoseMGMA = async () => {
  const dataService = getDataService();
  const results: any = {
    timestamp: new Date().toISOString(),
    mgmaSurveys: [],
    variableMappings: [],
    learnedMappings: [],
    sampleData: [],
    issues: []
  };

  try {
    // 1. Find MGMA surveys
    const allSurveys = await dataService.getAllSurveys();
    const mgmaSurveys = allSurveys.filter((s: any) => 
      s.name?.toLowerCase().includes('mgma') || 
      s.type?.toLowerCase().includes('mgma')
    );
    results.mgmaSurveys = mgmaSurveys.map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      year: s.year
    }));

    if (mgmaSurveys.length === 0) {
      results.issues.push('No MGMA surveys found');
      return results;
    }

    // 2. Get variable mappings
    const variableMappings = await dataService.getVariableMappings();
    results.variableMappings = variableMappings.filter((m: any) => 
      m.sourceVariables?.some((sv: any) => 
        sv.surveySource?.toLowerCase().includes('mgma')
      )
    );

    // 3. Get learned variable mappings
    const learnedMappings = await dataService.getLearnedMappings('variable');
    results.learnedMappings = Object.entries(learnedMappings || {})
      .filter(([key, value]) => 
        key.toLowerCase().includes('compensation') && 
        (key.toLowerCase().includes('rvu') || key.toLowerCase().includes('ratio'))
      )
      .map(([key, value]) => ({ original: key, mapped: value }));

    // 4. Get sample MGMA data rows
    for (const survey of mgmaSurveys.slice(0, 2)) {
      try {
        const surveyData = await dataService.getSurveyData(survey.id, {}, { limit: 100 });
        const rows = surveyData.rows || [];
        
        // Look for CF-related variables
        const cfRows = rows.filter((row: any) => {
          const data = row.data || row;
          const variable = data.variable || '';
          return variable && (
            variable.toLowerCase().includes('compensation') &&
            (variable.toLowerCase().includes('rvu') || variable.toLowerCase().includes('ratio') || variable.toLowerCase().includes('cf'))
          );
        });

        if (cfRows.length > 0) {
          const firstRowData = cfRows[0].data || cfRows[0];
          const rowData = firstRowData as Record<string, any>;
          
          results.sampleData.push({
            surveyName: survey.name,
            surveyId: survey.id,
            cfRowsFound: cfRows.length,
            sampleVariables: [...new Set(cfRows.map((r: any) => {
              const data = r.data || r;
              return (data as Record<string, any>).variable;
            }))].slice(0, 5),
            sampleRow: {
              variable: rowData.variable,
              p25: rowData.p25,
              p50: rowData.p50,
              p75: rowData.p75,
              p90: rowData.p90,
              specialty: rowData.specialty,
              region: rowData.geographicRegion || rowData.region
            }
          });
        } else {
          // Check for wide format columns
          if (rows.length > 0) {
            const firstRow = rows[0].data || rows[0];
            const rowData = firstRow as Record<string, any>;
            const columns = Object.keys(rowData);
            const cfColumns = columns.filter((col: string) => 
              col.toLowerCase().includes('compensation') && 
              (col.toLowerCase().includes('rvu') || col.toLowerCase().includes('ratio') || col.toLowerCase().includes('cf')) &&
              (col.toLowerCase().includes('p25') || col.toLowerCase().includes('p50') || col.toLowerCase().includes('median'))
            );
            
            if (cfColumns.length > 0) {
              results.sampleData.push({
                surveyName: survey.name,
                surveyId: survey.id,
                format: 'WIDE',
                cfColumnsFound: cfColumns,
                sampleColumns: cfColumns.slice(0, 5),
                sampleValues: cfColumns.slice(0, 2).map((col: string) => ({
                  column: col,
                  value: rowData[col]
                }))
              });
            }
          }
        }
      } catch (error) {
        results.issues.push(`Error processing survey ${survey.name}: ${error}`);
      }
    }

    // 5. Check for common issues
    if (results.sampleData.length === 0) {
      results.issues.push('No CF-related data found in MGMA surveys');
    }
    if (results.learnedMappings.length === 0) {
      results.issues.push('No learned variable mappings found for MGMA CF variables');
    }

  } catch (error) {
    results.issues.push(`Diagnostic error: ${error}`);
  }

  return results;
};

/**
 * Log diagnostic results to console
 */
export const logMGMA = async () => {
  const results = await diagnoseMGMA();
  console.group('🔍 MGMA CF Diagnostic Results');
  console.log('Timestamp:', results.timestamp);
  
  console.group('📊 MGMA Surveys Found');
  console.table(results.mgmaSurveys);
  console.groupEnd();
  
  if (results.variableMappings.length > 0) {
    console.group('🗺️ Variable Mappings');
    console.table(results.variableMappings.map((m: any) => ({
      standardizedName: m.standardizedName,
      sources: m.sourceVariables?.map((sv: any) => `${sv.surveySource}: ${sv.originalVariableName}`).join(', ')
    })));
    console.groupEnd();
  }
  
  if (results.learnedMappings.length > 0) {
    console.group('🧠 Learned Mappings');
    console.table(results.learnedMappings);
    console.groupEnd();
  }
  
  if (results.sampleData.length > 0) {
    console.group('📋 Sample Data Found');
    results.sampleData.forEach((data: any, idx: number) => {
      console.log(`\nSurvey ${idx + 1}: ${data.surveyName}`);
      console.log('Format:', data.format || 'LONG');
      if (data.sampleVariables) {
        console.log('Variables found:', data.sampleVariables);
      }
      if (data.cfColumnsFound) {
        console.log('CF Columns:', data.cfColumnsFound);
      }
      if (data.sampleRow) {
        console.log('Sample row:', data.sampleRow);
      }
    });
    console.groupEnd();
  }
  
  if (results.issues.length > 0) {
    console.group('⚠️ Issues Found');
    results.issues.forEach((issue: string) => console.warn(issue));
    console.groupEnd();
  }
  
  console.groupEnd();
  
  return results;
};

