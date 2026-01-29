/**
 * Quick diagnostic to check survey provider type issue
 * Run this in browser console to see what's happening
 */

(async function quickCheck() {
  console.log('🔍 Quick Survey Diagnostic\n');

  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('SurveyAggregatorDB', 7);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const surveys = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Find SullivanCotter surveys
    const sullivan = surveys.filter(s => {
      const name = (s.name || s.type || '').toLowerCase();
      return name.includes('sullivancotter') || name.includes('sullivan cotter');
    });

    console.log(`Found ${sullivan.length} SullivanCotter survey(s):\n`);

    sullivan.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name || s.id}`);
      console.log(`   providerType: "${s.providerType || 'MISSING'}"`);
      console.log(`   dataCategory: "${s.dataCategory || 'MISSING'}"`);
      console.log(`   type: "${s.type || 'N/A'}"`);
      
      // Check if it should show in Physician view
      const pt = (s.providerType || '').toUpperCase();
      const dc = s.dataCategory;
      const shouldShow = pt === 'PHYSICIAN' && 
                        dc !== 'CALL_PAY' && 
                        dc !== 'MOONLIGHTING' &&
                        (dc === 'COMPENSATION' || !dc);
      
      console.log(`   Should show in Physician view: ${shouldShow ? '✅ YES' : '❌ NO'}`);
      
      if (!shouldShow) {
        console.log(`   ⚠️ ISSUE: ${pt !== 'PHYSICIAN' ? `providerType is "${s.providerType}" (should be "PHYSICIAN")` : ''}`);
        if (dc === 'CALL_PAY' || dc === 'MOONLIGHTING') {
          console.log(`   ⚠️ ISSUE: dataCategory is "${dc}" (should be "COMPENSATION")`);
        }
      }
      console.log('');
    });

    // Check current DATA VIEW selection
    console.log('📊 Current DATA VIEW:');
    const sidebar = document.querySelector('[data-testid="provider-type-selector"], select, [role="combobox"]');
    if (sidebar) {
      console.log(`   Selected: ${sidebar.value || sidebar.textContent || 'Could not determine'}`);
    } else {
      console.log('   Could not find DATA VIEW selector in DOM');
    }
    console.log('');

    // Check provider type detection cache
    console.log('💾 Provider Type Detection Cache:');
    const cacheKey = 'providerTypeDetectionCache';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log(`   Cache exists (last scan: ${parsed.lastScan || 'unknown'})`);
        console.log(`   Detected types: ${parsed.availableTypes?.map(t => t.type).join(', ') || 'none'}`);
        console.log(`   ⚠️ Cache might be stale - try clearing it if data doesn't show`);
      } catch (e) {
        console.log(`   Cache exists but couldn't parse`);
      }
    } else {
      console.log('   No cache found');
    }
    console.log('');

    console.log('💡 Quick Fix Commands:');
    console.log('   1. Fix survey provider type:');
    console.log('      (Copy and paste fix-survey-provider-type.js)');
    console.log('');
    console.log('   2. Clear provider type cache:');
    console.log('      localStorage.removeItem("providerTypeDetectionCache");');
    console.log('      location.reload();');
    console.log('');
    console.log('   3. Change DATA VIEW to Physician:');
    console.log('      (Use the dropdown in the sidebar)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
