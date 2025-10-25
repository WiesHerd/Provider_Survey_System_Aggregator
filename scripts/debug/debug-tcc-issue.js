/**
 * Debug script to test TCC variable discovery and normalization
 * Run in browser console to debug the TCC display issue
 */

console.log('🔍 Debugging TCC Display Issue');
console.log('==============================\n');

// Test the normalization logic
function normalizeVariableName(variableName) {
  const normalized = variableName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return mapVariableNameToStandard(normalized);
}

function mapVariableNameToStandard(normalizedName) {
  const variableMapping = {
    'total_cash_compensation': 'tcc',
    'total_compensation': 'tcc',
    'total_cash_comp': 'tcc',
    'cash_compensation': 'tcc',
    'total_comp': 'tcc',
    'tcc': 'tcc',
    
    'work_rvus': 'work_rvus',
    'work_rvu': 'work_rvus',
    'wrvu': 'work_rvus',
    'wrvus': 'work_rvus',
    'work_relative_value_units': 'work_rvus',
    
    'tcc_per_work_rvu': 'tcc_per_work_rvu',
    'tcc_per_work_rvus': 'tcc_per_work_rvu',
    'tcc_per_wrvu': 'tcc_per_work_rvu',
    'conversion_factor': 'tcc_per_work_rvu',
    'cf': 'tcc_per_work_rvu',
    'comp_per_wrvu': 'tcc_per_work_rvu',
    'compensation_per_wrvu': 'tcc_per_work_rvu'
  };
  
  return variableMapping[normalizedName] || normalizedName;
}

// Test cases
const testCases = [
  'Total Cash Compensation',
  'TCC',
  'Work RVUs',
  'wRVU',
  'TCC per Work RVU',
  'Conversion Factor'
];

console.log('Testing variable normalization:');
testCases.forEach(testCase => {
  const normalized = normalizeVariableName(testCase);
  console.log(`"${testCase}" → "${normalized}"`);
});

console.log('\n🔍 Checking if TCC is in selected variables...');
console.log('Selected variables should be: ["tcc", "work_rvus", "tcc_per_work_rvu"]');

// Check localStorage for selected variables
const savedVariables = localStorage.getItem('analytics_selected_variables');
console.log('Saved variables from localStorage:', savedVariables);

if (savedVariables) {
  const parsed = JSON.parse(savedVariables);
  console.log('Parsed variables:', parsed);
  console.log('TCC included?', parsed.includes('tcc'));
} else {
  console.log('No saved variables found - using defaults');
}

console.log('\n🔍 To debug further, check:');
console.log('1. Browser Network tab for API calls');
console.log('2. Console for any error messages');
console.log('3. Check if data is being fetched with getAnalyticsDataByVariables()');
console.log('4. Verify that survey data contains TCC information');
