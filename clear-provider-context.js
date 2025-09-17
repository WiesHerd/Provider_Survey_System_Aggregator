/**
 * Clear Provider Context Script
 * Run this in browser console to clear the saved provider context state
 */

function clearProviderContext() {
  try {
    console.log('🗑️ Clearing provider context state...');
    
    // Clear localStorage
    localStorage.removeItem('provider-context-state');
    console.log('✅ Cleared provider-context-state from localStorage');
    
    // Clear any other related state
    localStorage.removeItem('provider-context-state');
    console.log('✅ Provider context state cleared');
    
    console.log('🔄 Please refresh the page to see the auto-detection in action');
    
  } catch (error) {
    console.error('❌ Error clearing provider context:', error);
  }
}

// Run the function
clearProviderContext();
