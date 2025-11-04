// Test script to check Custom Reports functionality
// Run this in the browser console at localhost:3000/custom-reports

console.log('🔍 Testing Custom Reports Implementation');
console.log('=====================================');

// Check if the page loaded correctly
if (typeof window !== 'undefined') {
  console.log('✅ Browser environment detected');
  
  // Check if React components are loaded
  if (document.querySelector('[data-testid="custom-reports"]') || 
      document.querySelector('.custom-reports') ||
      document.querySelector('h1')?.textContent?.includes('Custom Reports')) {
    console.log('✅ Custom Reports page loaded');
  } else {
    console.log('❌ Custom Reports page not found');
  }
  
  // Check for console logs from our implementation
  const originalLog = console.log;
  let customReportsLogs = [];
  
  console.log = function(...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('🔍 Custom Reports')) {
      customReportsLogs.push(args);
    }
    originalLog.apply(console, args);
  };
  
  // Wait a bit for logs to appear
  setTimeout(() => {
    console.log('📊 Custom Reports logs found:', customReportsLogs.length);
    customReportsLogs.forEach(log => console.log('📝', ...log));
  }, 2000);
  
} else {
  console.log('❌ Not in browser environment');
}




