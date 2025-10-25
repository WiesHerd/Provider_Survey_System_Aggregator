/**
 * Script to upload sample CSV data to IndexedDB
 * This will populate the database with the sample survey data
 */

async function uploadSampleData() {
  try {
    console.log('🚀 Starting sample data upload...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    // Sample files to upload
    const sampleFiles = [
      {
        filename: 'synthetic_gallagher.csv',
        name: 'Gallagher',
        year: 2024,
        type: 'Gallagher Physician'
      },
      {
        filename: 'synthetic_sullivan_cotter.csv', 
        name: 'SullivanCotterCleanNoQues',
        year: 2024,
        type: 'SullivanCotter Physician'
      },
      {
        filename: 'synthetic_mgma.csv',
        name: 'MGMA',
        year: 2024,
        type: 'MGMA'
      }
    ];
    
    for (const sample of sampleFiles) {
      try {
        console.log(`📤 Uploading ${sample.filename}...`);
        
        // Fetch the CSV file
        const response = await fetch(`/${sample.filename}`);
        if (!response.ok) {
          console.error(`❌ Failed to fetch ${sample.filename}:`, response.statusText);
          continue;
        }
        
        const csvText = await response.text();
        
        // Create a File object
        const file = new File([csvText], sample.filename, { type: 'text/csv' });
        
        // Upload using the data service
        const result = await dataService.uploadSurvey(
          file,
          sample.name,
          sample.year,
          sample.type
        );
        
        console.log(`✅ Successfully uploaded ${sample.filename}:`, result);
        
      } catch (error) {
        console.error(`❌ Error uploading ${sample.filename}:`, error);
      }
    }
    
    console.log('🎉 Sample data upload complete!');
    console.log('🔄 Please refresh the analytics page to see the data.');
    
  } catch (error) {
    console.error('❌ Error in upload process:', error);
  }
}

// Export for console use
window.uploadSampleData = uploadSampleData;

console.log('🚀 Run uploadSampleData() to upload sample CSV files to IndexedDB');
