/**
 * Demo file showing how to use the LLM-based specialty matching
 * This demonstrates the new intelligent matching capabilities
 */

import { LLMSpecialtyMatchingService } from './llmSpecialtyMatching';

/**
 * Demo function to test the LLM matching system
 */
export async function demoLLMMatching(): Promise<void> {
  console.log('🚀 Starting LLM Specialty Matching Demo...\n');

  // Initialize the service
  const service = new LLMSpecialtyMatchingService({
    similarityThreshold: 0.7,
    maxRetries: 3
  });

  // Test case 1: Allergy/Immunology variations
  console.log('📋 Test Case 1: Allergy/Immunology Variations');
  const allergySpecialties = [
    'allergy and immunology',
    'allergy immunology',
    'allergy/immunology',
    'allergy & immunology',
    'allergy',
    'immunology'
  ];

  try {
    const result1 = await service.matchAndGroupSpecialties(allergySpecialties);
    console.log('✅ Groups found:', result1.groups.length);
    result1.groups.forEach(group => {
      console.log(`  📦 Group: "${group.groupName}" (confidence: ${(group.confidence * 100).toFixed(1)}%)`);
      console.log(`     Specialties: ${group.specialties.join(', ')}`);
    });
  } catch (error) {
    console.log('❌ Test 1 failed:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test case 2: Cardiology variations
  console.log('📋 Test Case 2: Cardiology Variations');
  const cardiologySpecialties = [
    'cardiology',
    'cardiovascular',
    'cardiac',
    'heart',
    'interventional cardiology',
    'non-invasive cardiology'
  ];

  try {
    const result2 = await service.matchAndGroupSpecialties(cardiologySpecialties);
    console.log('✅ Groups found:', result2.groups.length);
    result2.groups.forEach(group => {
      console.log(`  📦 Group: "${group.groupName}" (confidence: ${(group.confidence * 100).toFixed(1)}%)`);
      console.log(`     Specialties: ${group.specialties.join(', ')}`);
    });
  } catch (error) {
    console.log('❌ Test 2 failed:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test case 3: Mixed specialties
  console.log('📋 Test Case 3: Mixed Specialties');
  const mixedSpecialties = [
    'allergy and immunology',
    'allergy immunology',
    'cardiology',
    'cardiovascular',
    'neurology',
    'neurological',
    'orthopedics',
    'orthopedic'
  ];

  try {
    const result3 = await service.matchAndGroupSpecialties(mixedSpecialties);
    console.log('✅ Groups found:', result3.groups.length);
    result3.groups.forEach(group => {
      console.log(`  📦 Group: "${group.groupName}" (confidence: ${(group.confidence * 100).toFixed(1)}%)`);
      console.log(`     Specialties: ${group.specialties.join(', ')}`);
    });
  } catch (error) {
    console.log('❌ Test 3 failed:', error);
  }

  console.log('\n🎉 Demo completed!');
  console.log('\n💡 Key Benefits:');
  console.log('  • Intelligent grouping of similar specialties');
  console.log('  • Handles variations like "allergy and immunology" vs "allergy immunology"');
  console.log('  • Free to use with Hugging Face API');
  console.log('  • Automatic fallback if API is unavailable');
  console.log('  • Enterprise-grade performance and reliability');
}

/**
 * Quick test function for browser console
 */
export async function quickTest(): Promise<void> {
  console.log('🧪 Quick LLM Test...');
  
  const service = new LLMSpecialtyMatchingService();
  const specialties = ['allergy and immunology', 'allergy immunology', 'cardiology', 'cardiovascular'];
  
  try {
    const result = await service.matchAndGroupSpecialties(specialties);
    console.log('✅ Result:', result);
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

// Make functions available in browser console
if (typeof window !== 'undefined') {
  (window as any).demoLLMMatching = demoLLMMatching;
  (window as any).quickTest = quickTest;
  
  console.log('🧪 LLM Demo functions available in browser console:');
  console.log('  - window.demoLLMMatching() - Full demo');
  console.log('  - window.quickTest() - Quick test');
}
