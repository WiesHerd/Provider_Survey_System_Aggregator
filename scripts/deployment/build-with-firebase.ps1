# Build Production Script with Firebase Configuration
# This script builds the app with Firebase environment variables from .env.local

Write-Host "🔨 Building for production with Firebase configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: .env.local file not found!" -ForegroundColor Red
    Write-Host "   Please run: node scripts/get-firebase-config.js" -ForegroundColor Yellow
    exit 1
}

# Load environment variables from .env.local
Write-Host "📋 Loading environment variables from .env.local..." -ForegroundColor Cyan
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^REACT_APP_' -and $_ -notmatch '^\s*#') {
        $key, $value = $_ -split '=', 2
        if ($key -and $value) {
            $key = $key.Trim()
            $value = $value.Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "   ✅ Set $key" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "🔍 Verifying required variables..." -ForegroundColor Cyan

# Check required variables
$requiredVars = @(
    "REACT_APP_FIREBASE_API_KEY",
    "REACT_APP_FIREBASE_AUTH_DOMAIN",
    "REACT_APP_FIREBASE_PROJECT_ID",
    "REACT_APP_FIREBASE_STORAGE_BUCKET",
    "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
    "REACT_APP_FIREBASE_APP_ID",
    "REACT_APP_STORAGE_MODE"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if (-not $value -or $value -eq "") {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Red
    }
    exit 1
}

# Verify storage mode
$storageMode = [Environment]::GetEnvironmentVariable("REACT_APP_STORAGE_MODE", "Process")
if ($storageMode -ne "firebase") {
    Write-Host "⚠️  Warning: REACT_APP_STORAGE_MODE is set to '$storageMode', not 'firebase'" -ForegroundColor Yellow
    Write-Host "   The app will use IndexedDB instead of Firebase in production." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "   Continue anyway? (y/n)"
    if ($response -ne "y") {
        exit 1
    }
}

Write-Host ""
Write-Host "✅ All required environment variables are set" -ForegroundColor Green
Write-Host ""

# Build the app
Write-Host "🔨 Building React app for production..." -ForegroundColor Cyan
Write-Host ""

$buildResult = npm run build 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Deploy to Firebase Hosting:" -ForegroundColor White
    Write-Host "      firebase deploy --only hosting" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   2. Or deploy to Vercel:" -ForegroundColor White
    Write-Host "      vercel production" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   3. After deployment, verify:" -ForegroundColor White
    Write-Host "      - Visit your production URL" -ForegroundColor Gray
    Write-Host "      - Sign in to the app" -ForegroundColor Gray
    Write-Host "      - Check storage status indicator shows 'Firebase (Cloud)'" -ForegroundColor Gray
    Write-Host "      - Upload a test file and verify in Firebase Console" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}





