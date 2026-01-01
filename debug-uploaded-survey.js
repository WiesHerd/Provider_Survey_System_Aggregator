/**
 * Debug script to check if uploaded survey exists in IndexedDB
 * Run this in the browser console after uploading a survey
 */

async function debugUploadedSurvey() {
  console.log('🔍 Checking IndexedDB for uploaded surveys...');
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SurveyAggregatorDB');
    
    request.onsuccess = async () => {
      const db = request.result;
      console.log('✅ Database opened');
      console.log('📊 Object stores:', Array.from(db.objectStoreNames));
      
      if (!db.objectStoreNames.contains('surveys')) {
        console.error('❌ No surveys object store found!');
        db.close();
        resolve();
        return;
      }
      
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const surveys = getAllRequest.result;
        console.log(`\n📊 Found ${surveys.length} surveys in IndexedDB:\n`);
        
        if (surveys.length === 0) {
          console.log('❌ NO SURVEYS FOUND - Survey was not saved!');
          console.log('\n💡 Possible issues:');
          console.log('   1. Upload failed silently');
          console.log('   2. Database transaction was not committed');
          console.log('   3. Survey was saved to a different database');
        } else {
          surveys.forEach((survey, index) => {
            console.log(`\n📋 Survey ${index + 1}:`);
            console.log(`   ID: ${survey.id}`);
            console.log(`   Name: ${survey.name}`);
            console.log(`   Year: ${survey.year} (type: ${typeof survey.year})`);
            console.log(`   SurveyYear: ${survey.surveyYear} (type: ${typeof survey.surveyYear})`);
            console.log(`   ProviderType: ${survey.providerType}`);
            console.log(`   Type: ${survey.type}`);
            console.log(`   DataCategory: ${survey.dataCategory}`);
            console.log(`   Source: ${survey.source}`);
            console.log(`   RowCount: ${survey.rowCount}`);
            console.log(`   UploadDate: ${survey.uploadDate}`);
          });
          
          // Check for Sullivan Cotter surveys specifically
          const sullivanCotterSurveys = surveys.filter(s => 
            s.name?.toLowerCase().includes('sullivan') || 
            s.type?.toLowerCase().includes('sullivan') ||
            s.source?.toLowerCase().includes('sullivan')
          );
          
          if (sullivanCotterSurveys.length > 0) {
            console.log(`\n✅ Found ${sullivanCotterSurveys.length} Sullivan Cotter survey(s):`);
            sullivanCotterSurveys.forEach(s => {
              console.log(`   - ${s.name} (Year: ${s.year}, ProviderType: ${s.providerType})`);
            });
          } else {
            console.log('\n⚠️ No Sullivan Cotter surveys found');
          }
          
          // Check year filter
          const year2025Surveys = surveys.filter(s => {
            const year = String(s.year || s.surveyYear || '').trim();
            return year === '2025';
          });
          console.log(`\n📅 Surveys with year 2025: ${year2025Surveys.length}`);
          if (year2025Surveys.length > 0) {
            year2025Surveys.forEach(s => {
              console.log(`   - ${s.name} (Year: ${s.year || s.surveyYear}, ProviderType: ${s.providerType})`);
            });
          }
        }
        
        db.close();
        resolve();
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ Failed to get surveys:', getAllRequest.error);
        db.close();
        reject(getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Failed to open database:', request.error);
      reject(request.error);
    };
  });
}

// Run the debug function
debugUploadedSurvey().catch(console.error);


