/**
 * Script to populate existing surveys with sample data
 * Run this in the browser console
 */

async function populateSurveys() {
  try {
    console.log('🚀 Starting survey population...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    // Get existing surveys
    const surveys = await dataService.getAllSurveys();
    console.log('📊 Found surveys:', surveys);
    
    if (surveys.length === 0) {
      console.log('❌ No surveys found. Please upload surveys first.');
      return;
    }
    
    // Sample data mapping
    const sampleDataMap = {
      'Gallagher': 'synthetic_gallagher.csv',
      'SullivanCotterCleanNoQues': 'synthetic_sullivan_cotter.csv',
      'MGMA': 'synthetic_mgma.csv'
    };
    
    for (const survey of surveys) {
      const sampleFile = sampleDataMap[survey.name];
      if (!sampleFile) {
        console.log(`⚠️ No sample data found for survey: ${survey.name}`);
        continue;
      }
      
      try {
        console.log(`📤 Populating ${survey.name} with ${sampleFile}...`);
        
        // Fetch the CSV file
        const response = await fetch(`/${sampleFile}`);
        if (!response.ok) {
          console.error(`❌ Failed to fetch ${sampleFile}:`, response.statusText);
          continue;
        }
        
        const csvText = await response.text();
        
        // Parse CSV data
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const dataRows = lines.slice(1).filter(row => row.trim());
        
        const parsedRows = dataRows.map(row => {
          const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });
          return rowData;
        });
        
        console.log(`📋 Parsed ${parsedRows.length} rows for ${survey.name}`);
        
        // Save the data to the existing survey
        await dataService.saveSurveyData(survey.id, parsedRows);
        
        // Update survey metadata
        const updatedSurvey = {
          ...survey,
          rowCount: parsedRows.length,
          specialtyCount: new Set(parsedRows.map(row => row.specialty || row.Specialty || row['Provider Type']).filter(Boolean)).size,
          dataPoints: parsedRows.length
        };
        
        await dataService.updateSurvey(updatedSurvey);
        
        console.log(`✅ Successfully populated ${survey.name} with ${parsedRows.length} rows`);
        
      } catch (error) {
        console.error(`❌ Error populating ${survey.name}:`, error);
      }
    }
    
    console.log('🎉 Survey population complete!');
    console.log('🔄 Please refresh the analytics page to see the data.');
    
  } catch (error) {
    console.error('❌ Error in population process:', error);
  }
}

// Export for console use
window.populateSurveys = populateSurveys;

console.log('🚀 Run populateSurveys() to populate existing surveys with sample data');
