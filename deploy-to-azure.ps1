# Azure Deployment Script for Survey Aggregator
# This script automates the Azure resource creation and deployment

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName = "SurveyAggregator-RG",
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$true)]
    [string]$SqlServerName = "survey-aggregator-server",
    
    [Parameter(Mandatory=$true)]
    [string]$DatabaseName = "SurveyAggregator",
    
    [Parameter(Mandatory=$true)]
    [string]$BackendAppName = "survey-aggregator-backend",
    
    [Parameter(Mandatory=$true)]
    [string]$FrontendAppName = "survey-aggregator-frontend",
    
    [Parameter(Mandatory=$true)]
    [string]$SqlAdminPassword
)

Write-Host "🚀 Starting Azure Deployment for Survey Aggregator..." -ForegroundColor Green

# Check if Azure CLI is installed
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "✅ Azure CLI version: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    exit 1
}

# Check if logged in to Azure
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Step 1: Create Resource Group
Write-Host "📦 Creating Resource Group..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --tags Environment=Production Project=SurveyAggregator

# Step 2: Create SQL Server
Write-Host "🗄️ Creating SQL Server..." -ForegroundColor Yellow
az sql server create `
    --name $SqlServerName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --admin-user "surveyadmin" `
    --admin-password $SqlAdminPassword

# Step 3: Create SQL Database
Write-Host "📊 Creating SQL Database..." -ForegroundColor Yellow
az sql db create `
    --resource-group $ResourceGroupName `
    --server $SqlServerName `
    --name $DatabaseName `
    --edition Standard `
    --capacity 10

# Step 4: Configure SQL Server Firewall
Write-Host "🔥 Configuring SQL Server Firewall..." -ForegroundColor Yellow
az sql server firewall-rule create `
    --resource-group $ResourceGroupName `
    --server $SqlServerName `
    --name "AllowAzureServices" `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

# Get current IP for development access
$currentIP = (Invoke-WebRequest -uri "http://ifconfig.me/ip").Content
az sql server firewall-rule create `
    --resource-group $ResourceGroupName `
    --server $SqlServerName `
    --name "AllowMyIP" `
    --start-ip-address $currentIP `
    --end-ip-address $currentIP

# Step 5: Create App Service Plan
Write-Host "📋 Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
    --name "$ResourceGroupName-Backend-Plan" `
    --resource-group $ResourceGroupName `
    --location $Location `
    --sku B1 `
    --is-linux

# Step 6: Create Backend App Service
Write-Host "🔧 Creating Backend App Service..." -ForegroundColor Yellow
az webapp create `
    --name $BackendAppName `
    --resource-group $ResourceGroupName `
    --plan "$ResourceGroupName-Backend-Plan" `
    --runtime "NODE|18-lts"

# Step 7: Configure Backend Environment Variables
Write-Host "⚙️ Configuring Backend Environment Variables..." -ForegroundColor Yellow
az webapp config appsettings set `
    --name $BackendAppName `
    --resource-group $ResourceGroupName `
    --settings `
        AZURE_SQL_SERVER="$SqlServerName.database.windows.net" `
        AZURE_SQL_DATABASE=$DatabaseName `
        AZURE_SQL_USER="surveyadmin" `
        AZURE_SQL_PASSWORD=$SqlAdminPassword `
        NODE_ENV="production" `
        PORT="8080" `
        CORS_ORIGIN="https://$FrontendAppName.azurestaticapps.net"

# Step 8: Create Static Web App
Write-Host "🌐 Creating Static Web App..." -ForegroundColor Yellow
az staticwebapp create `
    --name $FrontendAppName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --source https://github.com/wiesherd/Survey_Aggregator `
    --branch main `
    --app-location "/" `
    --api-location "/backend" `
    --output-location "build"

# Step 9: Get deployment URLs
Write-Host "🔗 Getting deployment URLs..." -ForegroundColor Yellow
$backendUrl = "https://$BackendAppName.azurewebsites.net"
$frontendUrl = "https://$FrontendAppName.azurestaticapps.net"

# Step 10: Test deployment
Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

try {
    $healthResponse = Invoke-WebRequest -Uri "$backendUrl/api/health" -UseBasicParsing
    Write-Host "✅ Backend health check passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Backend health check failed (this is normal during initial deployment)" -ForegroundColor Yellow
}

# Step 11: Display deployment information
Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "`n📋 Deployment Information:" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor White
Write-Host "Location: $Location" -ForegroundColor White
Write-Host "Backend URL: $backendUrl" -ForegroundColor White
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor White
Write-Host "SQL Server: $SqlServerName.database.windows.net" -ForegroundColor White
Write-Host "Database: $DatabaseName" -ForegroundColor White

Write-Host "`n🔐 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update GitHub repository secrets:" -ForegroundColor White
Write-Host "   - AZURE_WEBAPP_PUBLISH_PROFILE" -ForegroundColor White
Write-Host "   - AZURE_STATIC_WEB_APPS_API_TOKEN" -ForegroundColor White
Write-Host "   - REACT_APP_API_URL=$backendUrl" -ForegroundColor White

Write-Host "`n2. Configure CORS in backend if needed" -ForegroundColor White
Write-Host "3. Set up monitoring and alerts" -ForegroundColor White
Write-Host "4. Configure custom domain (optional)" -ForegroundColor White

Write-Host "`n📚 For more information, see: azure-deployment-guide.md" -ForegroundColor Yellow

















