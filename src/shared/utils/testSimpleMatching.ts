/**
 * Simple test for the new specialty matching system
 */

import { calculateSimilarity, standardizeSpecialty } from './specialtyMatching';

// Test the neonatal matching
console.log('🧪 Testing Neonatal Medicine matching:');
console.log('Neonatal Medicine ↔ Neonatal-Perinatal Medicine:', 
  calculateSimilarity('Neonatal Medicine', 'Neonatal-Perinatal Medicine'));

console.log('Neonatal Medicine ↔ Neonatal Medicine:', 
  calculateSimilarity('Neonatal Medicine', 'Neonatal Medicine'));

console.log('Neonatal-Perinatal Medicine ↔ Neonatal Medicine:', 
  calculateSimilarity('Neonatal-Perinatal Medicine', 'Neonatal Medicine'));

// Test standardization
console.log('\n🧪 Testing standardization:');
console.log('neonatal medicine →', standardizeSpecialty('neonatal medicine'));
console.log('neonatal perinatal medicine →', standardizeSpecialty('neonatal perinatal medicine'));

// Test other specialties
console.log('\n🧪 Testing other specialties:');
console.log('Cardiology ↔ Cardiovascular:', 
  calculateSimilarity('Cardiology', 'Cardiovascular'));
console.log('Internal Medicine ↔ Internal Med:', 
  calculateSimilarity('Internal Medicine', 'Internal Med'));

export const testSimpleMatching = () => {
  console.log('✅ Simple matching system test completed');
};
