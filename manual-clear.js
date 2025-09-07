// MANUAL NUCLEAR CLEAR - Copy and paste this into browser console (F12)
// This will aggressively clear all data storage

console.log('🚨 MANUAL NUCLEAR CLEAR STARTING...');

// Clear all possible IndexedDB databases
const dbNames = [
  'SurveyAggregatorDB',
  'survey-data', 
  'SurveyDataDB',
  'survey-aggregator-db',
  'benchpoint-db'
];

// Function to clear a database
async function clearDatabase(dbName) {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => {
      console.log(`✅ Deleted database: ${dbName}`);
      resolve(true);
    };
    request.onerror = () => {
      console.log(`ℹ️ Database ${dbName} not found`);
      resolve(true);
    };
  });
}

// Clear all databases
async function nuclearClear() {
  console.log('🗑️ Clearing all IndexedDB databases...');
  for (const dbName of dbNames) {
    await clearDatabase(dbName);
  }
  
  console.log('🗑️ Clearing localStorage...');
  localStorage.clear();
  
  console.log('🗑️ Clearing sessionStorage...');
  sessionStorage.clear();
  
  console.log('🗑️ Clearing cookies...');
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });
  
  console.log('🎉 NUCLEAR CLEAR COMPLETE! Reloading page...');
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// Run the nuclear clear
nuclearClear();
