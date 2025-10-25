/**
 * Test script to verify variable name normalization
 * Run in browser console to test the mapping logic
 */

// Test cases for variable normalization
const testCases = [
  { input: 'Total Cash Compensation', expected: 'tcc' },
  { input: 'TCC', expected: 'tcc' },
  { input: 'total cash compensation', expected: 'tcc' },
  { input: 'Work RVUs', expected: 'work_rvus' },
  { input: 'wRVU', expected: 'work_rvus' },
  { input: 'Work RVU', expected: 'work_rvus' },
  { input: 'TCC per Work RVU', expected: 'tcc_per_work_rvu' },
  { input: 'Conversion Factor', expected: 'tcc_per_work_rvu' },
  { input: 'CF', expected: 'tcc_per_work_rvu' },
  { input: 'Base Salary', expected: 'base_salary' },
  { input: 'ASA Units', expected: 'asa_units' }
];

// Simulate the normalization logic
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
    'compensation_per_wrvu': 'tcc_per_work_rvu',
    
    'base_salary': 'base_salary',
    'base_compensation': 'base_salary',
    'base_comp': 'base_salary',
    'salary': 'base_salary',
    
    'asa_units': 'asa_units',
    'asa': 'asa_units',
    'asa_unit': 'asa_units'
  };
  
  return variableMapping[normalizedName] || normalizedName;
}

// Run tests
console.log('🧪 Testing Variable Normalization');
console.log('================================\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }) => {
  const result = normalizeVariableName(input);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status}: "${input}" → "${result}" (expected: "${expected}")`);
});

console.log('\n================================');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All tests passed! TCC normalization should work correctly.');
} else {
  console.log('❌ Some tests failed. Review the mapping logic.');
}

