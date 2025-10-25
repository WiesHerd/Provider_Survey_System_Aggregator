#!/usr/bin/env node

/**
 * Development cache clearing script
 * Run this when you experience caching issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Clearing development cache...');

// Clear browser cache by updating index.html with new version
const indexPath = path.join(__dirname, 'public', 'index.html');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Update version number in favicon links
  const newVersion = Date.now();
  content = content.replace(/v=\d+/g, `v=${newVersion}`);
  
  fs.writeFileSync(indexPath, content);
  console.log(`✅ Updated cache-busting version to ${newVersion}`);
}

// Clear build directory if it exists
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
  const rimraf = require('rimraf');
  rimraf.sync(buildPath);
  console.log('✅ Cleared build directory');
}

console.log('🎉 Cache clearing complete!');
console.log('💡 Now run: npm start');
