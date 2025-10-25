/**
 * Script to populate IndexedDB with sample survey data
 * This will help test the Regional Analytics functionality
 */

// This script needs to be run in the browser console
// Copy and paste this into the browser console when the app is running

async function populateSampleData() {
  try {
    console.log('🚀 Starting to populate sample data...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Sample MGMA data
    const mgmaData = [
      {
        specialty: "General: Pediatrics",
        provider_type: "Staff Physician",
        geographic_region: "National",
        n_orgs: 139,
        n_incumbents: 1240,
        tcc_p25: 559038,
        tcc_p50: 621154,
        tcc_p75: 683269,
        tcc_p90: 745385,
        wrvu_p25: 2724,
        wrvu_p50: 3027,
        wrvu_p75: 3329,
        wrvu_p90: 3632,
        cf_p25: 52,
        cf_p50: 58,
        cf_p75: 63,
        cf_p90: 69
      },
      {
        specialty: "General: Pediatrics",
        provider_type: "Staff Physician",
        geographic_region: "Northeast",
        n_orgs: 56,
        n_incumbents: 1266,
        tcc_p25: 598171,
        tcc_p50: 664635,
        tcc_p75: 731098,
        tcc_p90: 797562,
        wrvu_p25: 2724,
        wrvu_p50: 3027,
        wrvu_p75: 3329,
        wrvu_p90: 3632,
        cf_p25: 52,
        cf_p50: 58,
        cf_p75: 63,
        cf_p90: 69
      },
      {
        specialty: "General: Pediatrics",
        provider_type: "Staff Physician",
        geographic_region: "Midwest",
        n_orgs: 59,
        n_incumbents: 405,
        tcc_p25: 531086,
        tcc_p50: 590097,
        tcc_p75: 649106,
        tcc_p90: 708116,
        wrvu_p25: 2724,
        wrvu_p50: 3027,
        wrvu_p75: 3329,
        wrvu_p90: 3632,
        cf_p25: 52,
        cf_p50: 58,
        cf_p75: 63,
        cf_p90: 69
      },
      {
        specialty: "General: Pediatrics",
        provider_type: "Staff Physician",
        geographic_region: "South",
        n_orgs: 50,
        n_incumbents: 495,
        tcc_p25: 542267,
        tcc_p50: 602520,
        tcc_p75: 662771,
        tcc_p90: 723023,
        wrvu_p25: 2724,
        wrvu_p50: 3027,
        wrvu_p75: 3329,
        wrvu_p90: 3632,
        cf_p25: 52,
        cf_p50: 58,
        cf_p75: 63,
        cf_p90: 69
      },
      {
        specialty: "General: Pediatrics",
        provider_type: "Staff Physician",
        geographic_region: "West",
        n_orgs: 127,
        n_incumbents: 1476,
        tcc_p25: 614942,
        tcc_p50: 683270,
        tcc_p75: 751596,
        tcc_p90: 819924,
        wrvu_p25: 2724,
        wrvu_p50: 3027,
        wrvu_p75: 3329,
        wrvu_p90: 3632,
        cf_p25: 52,
        cf_p50: 58,
        cf_p75: 63,
        cf_p90: 69
      }
    ];
    
    // Create MGMA survey
    const mgmaSurvey = await dataService.createSurvey({
      name: "MGMA Sample Data",
      type: "MGMA",
      year: "2024",
      rowCount: mgmaData.length
    });
    
    console.log('📊 Created MGMA survey:', mgmaSurvey.id);
    
    // Save MGMA data
    await dataService.saveSurveyData(mgmaSurvey.id, mgmaData);
    console.log('✅ Saved MGMA data');
    
    // Sample Sullivan Cotter data
    const sullivanData = [
      {
        specialty: "Pediatrics General",
        provider_type: "Staff Physician",
        geographic_region: "National",
        n_orgs: 90,
        n_incumbents: 944,
        tcc_p25: 480611,
        tcc_p50: 534013,
        tcc_p75: 587414,
        tcc_p90: 640815,
        wrvu_p25: 6733,
        wrvu_p50: 7482,
        wrvu_p75: 8230,
        wrvu_p90: 8978,
        cf_p25: 70,
        cf_p50: 78,
        cf_p75: 85,
        cf_p90: 93
      },
      {
        specialty: "Pediatrics General",
        provider_type: "Staff Physician",
        geographic_region: "Northeast",
        n_orgs: 88,
        n_incumbents: 1277,
        tcc_p25: 514253,
        tcc_p50: 571393,
        tcc_p75: 628532,
        tcc_p90: 685672,
        wrvu_p25: 6733,
        wrvu_p50: 7482,
        wrvu_p75: 8230,
        wrvu_p90: 8978,
        cf_p25: 70,
        cf_p50: 78,
        cf_p75: 85,
        cf_p90: 93
      },
      {
        specialty: "Pediatrics General",
        provider_type: "Staff Physician",
        geographic_region: "Midwest",
        n_orgs: 125,
        n_incumbents: 1456,
        tcc_p25: 456580,
        tcc_p50: 507312,
        tcc_p75: 558043,
        tcc_p90: 608774,
        wrvu_p25: 6733,
        wrvu_p50: 7482,
        wrvu_p75: 8230,
        wrvu_p90: 8978,
        cf_p25: 70,
        cf_p50: 78,
        cf_p75: 85,
        cf_p90: 93
      },
      {
        specialty: "Pediatrics General",
        provider_type: "Staff Physician",
        geographic_region: "South",
        n_orgs: 93,
        n_incumbents: 1019,
        tcc_p25: 466192,
        tcc_p50: 517992,
        tcc_p75: 569791,
        tcc_p90: 621590,
        wrvu_p25: 6733,
        wrvu_p50: 7482,
        wrvu_p75: 8230,
        wrvu_p90: 8978,
        cf_p25: 70,
        cf_p50: 78,
        cf_p75: 85,
        cf_p90: 93
      },
      {
        specialty: "Pediatrics General",
        provider_type: "Staff Physician",
        geographic_region: "West",
        n_orgs: 58,
        n_incumbents: 136,
        tcc_p25: 528672,
        tcc_p50: 587414,
        tcc_p75: 646155,
        tcc_p90: 704896,
        wrvu_p25: 6733,
        wrvu_p50: 7482,
        wrvu_p75: 8230,
        wrvu_p90: 8978,
        cf_p25: 70,
        cf_p50: 78,
        cf_p75: 85,
        cf_p90: 93
      }
    ];
    
    // Create Sullivan Cotter survey
    const sullivanSurvey = await dataService.createSurvey({
      name: "Sullivan Cotter Sample Data",
      type: "SullivanCotter",
      year: "2024",
      rowCount: sullivanData.length
    });
    
    console.log('📊 Created Sullivan Cotter survey:', sullivanSurvey.id);
    
    // Save Sullivan Cotter data
    await dataService.saveSurveyData(sullivanSurvey.id, sullivanData);
    console.log('✅ Saved Sullivan Cotter data');
    
    // Create specialty mappings
    const specialtyMappings = [
      {
        standardizedName: "Pediatrics",
        sourceSpecialties: [
          { specialty: "General: Pediatrics", surveySource: "MGMA" },
          { specialty: "Pediatrics General", surveySource: "SullivanCotter" }
        ]
      }
    ];
    
    for (const mapping of specialtyMappings) {
      await dataService.createSpecialtyMapping(mapping);
    }
    
    console.log('✅ Created specialty mappings');
    
    // Verify data
    const surveys = await dataService.getAllSurveys();
    console.log('📊 Total surveys:', surveys.length);
    
    const mappings = await dataService.getAllSpecialtyMappings();
    console.log('📊 Total specialty mappings:', mappings.length);
    
    console.log('🎯 Sample data populated successfully!');
    console.log('🔍 You can now test the Regional Analytics screen');
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  window.populateSampleData = populateSampleData;
  console.log('🔍 Run populateSampleData() to populate sample data');
} else {
  console.log('This script needs to be run in a browser environment');
}
