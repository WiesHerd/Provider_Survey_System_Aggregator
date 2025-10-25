# 🚀 Survey Aggregator Backend Deployment Script
# This script helps deploy your backend to Railway

Write-Host "🚀 Survey Aggregator Backend Deployment" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if Railway CLI is installed
Write-Host "📋 Checking Railway CLI..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Installing..." -ForegroundColor Red
    Write-Host "Please run: npm install -g @railway/cli" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

# Navigate to backend directory
Write-Host "📁 Navigating to backend directory..." -ForegroundColor Yellow
Set-Location backend

# Check if user is logged in
Write-Host "🔐 Checking Railway login..." -ForegroundColor Yellow
try {
    $loginStatus = railway whoami
    Write-Host "✅ Logged in as: $loginStatus" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
    Write-Host "Please run: railway login" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

# Deploy to Railway
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Yellow
try {
    railway up
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Get the domain
Write-Host "🌐 Getting your backend URL..." -ForegroundColor Yellow
try {
    $domain = railway domain
    Write-Host "✅ Your backend is available at: $domain" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Update your frontend environment variable:" -ForegroundColor White
    Write-Host "   REACT_APP_API_URL=$domain" -ForegroundColor Gray
    Write-Host "2. Rebuild and redeploy your frontend" -ForegroundColor White
    Write-Host "3. Test your backend: curl $domain/api/health" -ForegroundColor White
} catch {
    Write-Host "❌ Could not get domain" -ForegroundColor Red
    Write-Host "Check Railway dashboard for your app URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
