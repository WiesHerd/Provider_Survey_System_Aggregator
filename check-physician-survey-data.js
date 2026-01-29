/**
 * Diagnostic script to check Physician and SullivanCotter survey data
 * Run this in browser console to diagnose why data isn't showing in data view
 */

(async function checkPhysicianSurveyData() {
  console.log('🔍 Checking Physician and SullivanCotter survey data...\n');

  try {
    // Open IndexedDB
    const dbName = 'SurveyAggregatorDB';
    const dbVersion = 7;
    
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        console.warn('⚠️ Database upgrade needed');
      };
    });

    console.log('✅ Connected to IndexedDB\n');

    // Get all surveys
    const surveys = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    console.log(`📊 Found ${surveys.length} total surveys\n`);

    // Filter for SullivanCotter surveys
    const sullivanCotterSurveys = surveys.filter(s => {
      const name = (s.name || s.type || '').toLowerCase();
      const type = (s.type || '').toLowerCase();
      return name.includes('sullivancotter') || 
             name.includes('sullivan cotter') || 
             name.includes('sullivan-cotter') ||
             type.includes('sullivancotter');
    });

    console.log(`🔍 Found ${sullivanCotterSurveys.length} SullivanCotter survey(s):\n`);
    sullivanCotterSurveys.forEach((survey, index) => {
      console.log(`${index + 1}. Survey ID: ${survey.id}`);
      console.log(`   Name: ${survey.name || 'N/A'}`);
      console.log(`   Type: ${survey.type || 'N/A'}`);
      console.log(`   Provider Type: ${survey.providerType || 'N/A'}`);
      console.log(`   Data Category: ${survey.dataCategory || 'N/A'}`);
      console.log(`   Year: ${survey.year || survey.surveyYear || 'N/A'}`);
      console.log(`   Row Count: ${survey.rowCount || 0}`);
      console.log(`   Upload Date: ${survey.uploadDate ? new Date(survey.uploadDate).toLocaleString() : 'N/A'}`);
      console.log('');
    });

    // Filter for Physician provider type surveys
    const physicianSurveys = surveys.filter(s => {
      const providerType = (s.providerType || '').toUpperCase();
      return providerType === 'PHYSICIAN' || 
             providerType === 'STAFF PHYSICIAN' ||
             providerType === 'STAFFPHYSICIAN' ||
             (s.dataCategory !== 'CALL_PAY' && 
              s.dataCategory !== 'MOONLIGHTING' && 
              !s.type?.toLowerCase().includes('app'));
    });

    console.log(`👨‍⚕️ Found ${physicianSurveys.length} Physician-type survey(s):\n`);
    physicianSurveys.forEach((survey, index) => {
      console.log(`${index + 1}. Survey ID: ${survey.id}`);
      console.log(`   Name: ${survey.name || 'N/A'}`);
      console.log(`   Type: ${survey.type || 'N/A'}`);
      console.log(`   Provider Type: ${survey.providerType || 'N/A'}`);
      console.log(`   Data Category: ${survey.dataCategory || 'N/A'}`);
      console.log(`   Year: ${survey.year || survey.surveyYear || 'N/A'}`);
      console.log(`   Row Count: ${survey.rowCount || 0}`);
      console.log('');
    });

    // Check for SullivanCotter + Physician combination
    const sullivanCotterPhysician = sullivanCotterSurveys.filter(s => {
      const providerType = (s.providerType || '').toUpperCase();
      return providerType === 'PHYSICIAN' || 
             providerType === 'STAFF PHYSICIAN' ||
             providerType === 'STAFFPHYSICIAN';
    });

    console.log(`🎯 Found ${sullivanCotterPhysician.length} SullivanCotter + Physician survey(s):\n`);
    if (sullivanCotterPhysician.length > 0) {
      sullivanCotterPhysician.forEach((survey, index) => {
        console.log(`${index + 1}. Survey ID: ${survey.id}`);
        console.log(`   Name: ${survey.name || 'N/A'}`);
        console.log(`   Provider Type: ${survey.providerType || 'N/A'}`);
        console.log(`   Year: ${survey.year || survey.surveyYear || 'N/A'}`);
        console.log(`   Row Count: ${survey.rowCount || 0}`);
        
        // Check actual data rows
        console.log(`   Checking data rows...`);
        checkSurveyDataRows(db, survey.id).then(rowInfo => {
          console.log(`   ✅ Data rows found: ${rowInfo.totalRows}`);
          console.log(`   ✅ Unique provider types in data: ${rowInfo.providerTypes.join(', ') || 'None'}`);
          console.log(`   ✅ Sample specialties: ${rowInfo.sampleSpecialties.slice(0, 5).join(', ')}`);
          console.log('');
        }).catch(err => {
          console.error(`   ❌ Error checking data rows:`, err);
        });
      });
    } else {
      console.log('⚠️ No SullivanCotter + Physician surveys found!\n');
      console.log('This might be why the data isn\'t showing in the Physician data view.\n');
    }

    // Check storage mode
    console.log('\n📦 Checking storage configuration...');
    const storageMode = localStorage.getItem('storageMode') || 'not set';
    const reactAppStorageMode = window.location.search.includes('storageMode=') 
      ? new URLSearchParams(window.location.search).get('storageMode')
      : 'not set in URL';
    
    console.log(`   Local storage mode: ${storageMode}`);
    console.log(`   URL storage mode: ${reactAppStorageMode}`);
    console.log(`   Environment check: ${typeof process !== 'undefined' && process.env?.REACT_APP_STORAGE_MODE || 'N/A (browser)'}`);
    
    // Check Firebase availability
    try {
      const firebaseModule = await import('./src/config/firebase.ts');
      const isFirebaseAvailable = firebaseModule?.isFirebaseAvailable?.() || false;
      console.log(`   Firebase available: ${isFirebaseAvailable}`);
    } catch (e) {
      console.log(`   Firebase check: Could not determine (${e.message})`);
    }

    console.log('\n✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
  }
})();

async function checkSurveyDataRows(db, surveyId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['surveyData'], 'readonly');
    const store = transaction.objectStore('surveyData');
    const index = store.index('surveyId');
    const request = index.getAll(surveyId);
    
    const rowInfo = {
      totalRows: 0,
      providerTypes: [],
      sampleSpecialties: []
    };
    
    request.onsuccess = () => {
      const chunks = request.result;
      const allRows = [];
      
      chunks.forEach(chunk => {
        if (chunk.data && Array.isArray(chunk.data)) {
          allRows.push(...chunk.data);
        }
      });
      
      rowInfo.totalRows = allRows.length;
      
      // Extract unique provider types
      const providerTypes = new Set();
      const specialties = new Set();
      
      allRows.slice(0, 100).forEach(row => {
        const pt = row.providerType || row['Provider Type'] || row.provider_type || '';
        if (pt) providerTypes.add(pt);
        
        const spec = row.specialty || row.Specialty || row.specialty_name || '';
        if (spec) specialties.add(spec);
      });
      
      rowInfo.providerTypes = Array.from(providerTypes);
      rowInfo.sampleSpecialties = Array.from(specialties).slice(0, 10);
      
      resolve(rowInfo);
    };
    
    request.onerror = () => reject(request.error);
  });
}
