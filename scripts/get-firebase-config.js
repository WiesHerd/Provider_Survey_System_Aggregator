/**
 * Firebase Configuration Helper Script
 * 
 * This script helps you get your Firebase configuration values
 * and creates/updates your .env.local file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Getting Firebase configuration...\n');

const projectId = 'provider-survey-aggregator';
const authDomain = `${projectId}.firebaseapp.com`;
const storageBucket = `${projectId}.appspot.com`;

// Try to get config from Firebase CLI
let apiKey = '';
let messagingSenderId = '';
let appId = '';

try {
  console.log('📡 Attempting to get Firebase config from CLI...');
  const configOutput = execSync(`firebase apps:sdkconfig WEB --project ${projectId}`, { encoding: 'utf-8' });
  
  // Parse JSON config output
  const jsonMatch = configOutput.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const config = JSON.parse(jsonMatch[0]);
    apiKey = config.apiKey || '';
    messagingSenderId = config.messagingSenderId || '';
    appId = config.appId || '';
    const actualAuthDomain = config.authDomain || authDomain;
    const actualStorageBucket = config.storageBucket || storageBucket;
    const measurementId = config.measurementId || '';
    
    console.log('✅ Successfully retrieved config from CLI\n');
    
    // Update values for .env.local
    if (actualAuthDomain !== authDomain) {
      console.log(`ℹ️  Using authDomain: ${actualAuthDomain}`);
    }
    if (actualStorageBucket !== storageBucket) {
      console.log(`ℹ️  Using storageBucket: ${actualStorageBucket}`);
    }
  } else {
    // Fallback to regex parsing if JSON not found
    const apiKeyMatch = configOutput.match(/apiKey["\s:]+["']([^"']+)["']/);
    const senderIdMatch = configOutput.match(/messagingSenderId["\s:]+["']([^"']+)["']/);
    const appIdMatch = configOutput.match(/appId["\s:]+["']([^"']+)["']/);
    
    if (apiKeyMatch) apiKey = apiKeyMatch[1];
    if (senderIdMatch) messagingSenderId = senderIdMatch[1];
    if (appIdMatch) appId = appIdMatch[1];
  }
} catch (error) {
  console.log('⚠️  Could not get config from CLI. You will need to get values from Firebase Console.\n');
  console.log('📋 Please visit: https://console.firebase.google.com/project/provider-survey-aggregator/settings/general\n');
  console.log('   Scroll to "Your apps" section and click on your web app to see the config values.\n');
}

// Get actual values from config if available
let actualAuthDomain = authDomain;
let actualStorageBucket = storageBucket;
let measurementId = '';

try {
  const configOutput = execSync(`firebase apps:sdkconfig WEB --project ${projectId}`, { encoding: 'utf-8' });
  const jsonMatch = configOutput.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const config = JSON.parse(jsonMatch[0]);
    actualAuthDomain = config.authDomain || authDomain;
    actualStorageBucket = config.storageBucket || storageBucket;
    measurementId = config.measurementId || '';
  }
} catch (e) {
  // Use defaults if can't get config
}

// Create .env.local template
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envContent = `# Firebase Configuration
# Generated automatically - DO NOT commit this file to git
# Project: provider-survey-aggregator
# Get values from: https://console.firebase.google.com/project/provider-survey-aggregator/settings/general

# Required Firebase Configuration
REACT_APP_FIREBASE_API_KEY=${apiKey || 'YOUR_API_KEY_HERE'}
REACT_APP_FIREBASE_AUTH_DOMAIN=${actualAuthDomain}
REACT_APP_FIREBASE_PROJECT_ID=${projectId}
REACT_APP_FIREBASE_STORAGE_BUCKET=${actualStorageBucket}
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId || 'YOUR_SENDER_ID_HERE'}
REACT_APP_FIREBASE_APP_ID=${appId || 'YOUR_APP_ID_HERE'}

# Storage Mode - Set to 'firebase' to use Firestore backend
REACT_APP_STORAGE_MODE=firebase

# Optional: Measurement ID for Analytics (if using Firebase Analytics)
${measurementId ? `REACT_APP_FIREBASE_MEASUREMENT_ID=${measurementId}` : '# REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id_here'}
`;

// Check if .env.local already exists
if (fs.existsSync(envLocalPath)) {
  console.log('⚠️  .env.local already exists. Backing up to .env.local.backup...');
  fs.copyFileSync(envLocalPath, envLocalPath + '.backup');
}

// Write the file
fs.writeFileSync(envLocalPath, envContent, 'utf-8');
console.log('✅ Created/Updated .env.local file\n');

if (!apiKey || !messagingSenderId || !appId) {
  console.log('⚠️  Some values are missing. Please update .env.local with the following:\n');
  console.log('   1. Go to: https://console.firebase.google.com/project/provider-survey-aggregator/settings/general');
  console.log('   2. Scroll to "Your apps" section');
  console.log('   3. Click on your web app (or create one if needed)');
  console.log('   4. Copy the config values and update .env.local\n');
} else {
  console.log('✅ All Firebase configuration values found!');
  console.log('✅ Your .env.local file is ready to use.\n');
  console.log('📝 Next steps:');
  console.log('   1. Restart your development server');
  console.log('   2. The app will use Firebase backend for storage\n');
}

console.log('🔗 Firebase Console: https://console.firebase.google.com/project/provider-survey-aggregator');

