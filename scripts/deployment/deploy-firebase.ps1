# Firebase Deployment Script
# Deploys Firestore rules and indexes to Firebase

Write-Host "🔍 Checking Firebase CLI..." -ForegroundColor Cyan

# Check if Firebase CLI is installed
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    npm install -g firebase-tools
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Firebase CLI" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Firebase CLI is installed" -ForegroundColor Green
firebase --version

Write-Host "`n🔍 Checking Firebase login status..." -ForegroundColor Cyan

# Check if logged in
$loginStatus = firebase login:list 2>&1
if ($LASTEXITCODE -ne 0 -or $loginStatus -match "No authorized accounts") {
    Write-Host "⚠️  Not logged in to Firebase. Logging in..." -ForegroundColor Yellow
    firebase login --no-localhost
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to login to Firebase" -ForegroundColor Red
        Write-Host "💡 Try: firebase login" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Logged in to Firebase" -ForegroundColor Green

Write-Host "`n🔍 Checking Firebase project..." -ForegroundColor Cyan
firebase use
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to get Firebase project" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Deploying Firestore Security Rules..." -ForegroundColor Cyan
firebase deploy --only firestore:rules
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Firestore rules" -ForegroundColor Red
    Write-Host "💡 Check your internet connection and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Firestore rules deployed successfully" -ForegroundColor Green

Write-Host "`n📦 Deploying Firestore Indexes..." -ForegroundColor Cyan
firebase deploy --only firestore:indexes
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Firestore indexes" -ForegroundColor Red
    Write-Host "💡 Check your internet connection and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Firestore indexes deployed successfully" -ForegroundColor Green

Write-Host "`n🎉 Firebase deployment complete!" -ForegroundColor Green
Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Firestore Security Rules deployed" -ForegroundColor Green
Write-Host "  ✅ Firestore Indexes deployed" -ForegroundColor Green
Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
Write-Host "  - Verify rules in Firebase Console: https://console.firebase.google.com/project/provider-survey-aggregator/firestore/rules" -ForegroundColor White
Write-Host "  - Verify indexes in Firebase Console: https://console.firebase.google.com/project/provider-survey-aggregator/firestore/indexes" -ForegroundColor White





