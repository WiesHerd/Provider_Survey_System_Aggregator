/**
 * Test file for Local AI-based specialty matching
 * Run this to test the new intelligent matching system
 */

import { testLocalAIMatching } from './llmSpecialtyMatching';

/**
 * Test the Local AI matching with allergy/immunology specialties
 */
export async function testAllergyImmunologyMatching(): Promise<void> {
  console.log('🧪 Testing Local AI-based specialty matching for allergy/immunology...');
  
  const allergySpecialties = [
    'allergy and immunology',
    'allergy immunology', 
    'allergy/immunology',
    'allergy & immunology',
    'allergy',
    'immunology'
  ];

  await testLocalAIMatching(allergySpecialties);
}

/**
 * Test with various specialty variations
 */
export async function testVariousSpecialties(): Promise<void> {
  console.log('🧪 Testing Local AI-based specialty matching with various specialties...');
  
  const specialties = [
    // Cardiology variations
    'cardiology',
    'cardiovascular',
    'cardiac',
    'heart',
    
    // Neurology variations  
    'neurology',
    'neurological',
    'neuro',
    
    // Orthopedics variations
    'orthopedics',
    'orthopedic',
    'ortho',
    
    // Dermatology variations
    'dermatology',
    'dermatological',
    'derm',
    
    // Allergy variations
    'allergy and immunology',
    'allergy immunology',
    'allergy/immunology'
  ];

  await testLocalAIMatching(specialties);
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Local AI specialty matching tests...\n');
  
  try {
    await testAllergyImmunologyMatching();
    console.log('\n' + '='.repeat(50) + '\n');
    await testVariousSpecialties();
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - add to window for testing
  (window as any).testLocalAIMatching = {
    testAllergyImmunologyMatching,
    testVariousSpecialties,
    runAllTests
  };
  
  console.log('🧪 Local AI matching tests available in browser console:');
  console.log('  - window.testLocalAIMatching.testAllergyImmunologyMatching()');
  console.log('  - window.testLocalAIMatching.testVariousSpecialties()');
  console.log('  - window.testLocalAIMatching.runAllTests()');
}
