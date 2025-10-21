/**
 * Script to test blend template saving functionality
 * Run this in the browser console to test the template save feature
 */

async function testTemplateSave() {
  try {
    console.log('🧪 Testing blend template save functionality...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Test template data
    const testTemplate = {
      id: 'test-template-' + Date.now(),
      name: 'Test Family Medicine Blend',
      description: 'Test template for family medicine specialties',
      specialties: [
        {
          id: 'family-medicine-1',
          name: 'Family Medicine',
          records: 100,
          weight: 50,
          surveySource: 'MGMA',
          surveyYear: '2024',
          geographicRegion: 'National',
          providerType: 'Physician'
        }
      ],
      weights: [50],
      createdBy: 'test_user',
      isPublic: false,
      tags: ['family-medicine', 'test'],
      createdAt: new Date()
    };
    
    console.log('📝 Test template:', testTemplate);
    
    // Try to save the template
    console.log('💾 Attempting to save template...');
    
    // Import the IndexedDB service directly
    const { IndexedDBService } = await import('./src/services/IndexedDBService.js');
    const dbService = new IndexedDBService();
    
    await dbService.saveBlendTemplate(testTemplate);
    console.log('✅ Template saved successfully!');
    
    // Verify it was saved by retrieving it
    console.log('🔍 Retrieving saved templates...');
    const savedTemplates = await dbService.getAllBlendTemplates();
    console.log('📋 Saved templates:', savedTemplates);
    
    // Check if our test template is there
    const ourTemplate = savedTemplates.find(t => t.id === testTemplate.id);
    if (ourTemplate) {
      console.log('✅ Test template found in database:', ourTemplate.name);
    } else {
      console.log('❌ Test template not found in database');
    }
    
    console.log('🎉 Template save test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing template save:', error);
  }
}

// Make it available globally
window.testTemplateSave = testTemplateSave;

console.log('🧪 Template save tester loaded. Run testTemplateSave() in the console.');










