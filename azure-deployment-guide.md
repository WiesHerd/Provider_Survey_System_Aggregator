# 🚀 Azure Deployment Guide - Survey Aggregator

This guide will help you deploy your Survey Aggregator application to Azure services, following enterprise-grade best practices.

## 📋 Prerequisites

- Azure subscription
- Azure CLI installed and configured
- Node.js 18+ and npm
- Git repository access
- Docker (optional, for containerized deployment)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React App)   │◄──►│   (Node.js API) │◄──►│   (Azure SQL)   │
│   Azure Static  │    │   App Service   │    │   Database      │
│   Web Apps      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Step 1: Azure Resource Setup

### 1.1 Create Resource Group

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name SurveyAggregator-RG \
  --location eastus \
  --tags Environment=Production Project=SurveyAggregator
```

### 1.2 Create Azure SQL Database (if not already done)

```bash
# Create SQL Server
az sql server create \
  --name survey-aggregator-server \
  --resource-group SurveyAggregator-RG \
  --location eastus \
  --admin-user surveyadmin \
  --admin-password "YourStrongPassword123!"

# Create SQL Database
az sql db create \
  --resource-group SurveyAggregator-RG \
  --server survey-aggregator-server \
  --name SurveyAggregator \
  --edition Standard \
  --capacity 10

# Configure firewall rule (allow Azure services)
az sql server firewall-rule create \
  --resource-group SurveyAggregator-RG \
  --server survey-aggregator-server \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 1.3 Create App Service Plan

```bash
# Create App Service Plan for backend
az appservice plan create \
  --name SurveyAggregator-Backend-Plan \
  --resource-group SurveyAggregator-RG \
  --location eastus \
  --sku B1 \
  --is-linux

# Create App Service Plan for frontend (Static Web Apps)
# (Static Web Apps have their own hosting, no separate plan needed)
```

### 1.4 Create Backend App Service

```bash
# Create backend web app
az webapp create \
  --name survey-aggregator-backend \
  --resource-group SurveyAggregator-RG \
  --plan SurveyAggregator-Backend-Plan \
  --runtime "NODE|18-lts"

# Configure environment variables
az webapp config appsettings set \
  --name survey-aggregator-backend \
  --resource-group SurveyAggregator-RG \
  --settings \
    AZURE_SQL_SERVER="survey-aggregator-server.database.windows.net" \
    AZURE_SQL_DATABASE="SurveyAggregator" \
    AZURE_SQL_USER="surveyadmin" \
    AZURE_SQL_PASSWORD="YourStrongPassword123!" \
    NODE_ENV="production" \
    PORT="8080"
```

### 1.5 Create Frontend Static Web App

```bash
# Create Static Web App
az staticwebapp create \
  --name survey-aggregator-frontend \
  --resource-group SurveyAggregator-RG \
  --location eastus \
  --source https://github.com/yourusername/Survey_Aggregator \
  --branch main \
  --app-location "/" \
  --api-location "/backend" \
  --output-location "build"
```

## 🔄 Step 2: CI/CD Pipeline Setup

### 2.1 GitHub Actions for Backend

Create `.github/workflows/azure-backend-deploy.yml`:

```yaml
name: Deploy Backend to Azure

on:
  push:
    branches: [ main ]
    paths: [ 'backend/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'backend/**' ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run tests
      run: |
        cd backend
        npm test
    
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'survey-aggregator-backend'
        package: ./backend
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

### 2.2 GitHub Actions for Frontend

Create `.github/workflows/azure-frontend-deploy.yml`:

```yaml
name: Deploy Frontend to Azure Static Web Apps

on:
  push:
    branches: [ main ]
    paths: [ 'src/**', 'public/**', 'package.json' ]
  pull_request:
    branches: [ main ]
    paths: [ 'src/**', 'public/**', 'package.json' ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
    
    - name: Deploy to Azure Static Web Apps
      uses: Azure/static-web-apps-deploy@v1
      with:
        azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        action: "upload"
        app_location: "/" 
        output_location: "build"
```

## 🔐 Step 3: Environment Configuration

### 3.1 Backend Environment Variables

Set these in Azure App Service Configuration:

```env
# Database Configuration
AZURE_SQL_SERVER=survey-aggregator-server.database.windows.net
AZURE_SQL_DATABASE=SurveyAggregator
AZURE_SQL_USER=surveyadmin
AZURE_SQL_PASSWORD=YourStrongPassword123!

# Application Configuration
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://survey-aggregator-frontend.azurestaticapps.net

# Security
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3.2 Frontend Environment Variables

Create `.env.production`:

```env
REACT_APP_API_URL=https://survey-aggregator-backend.azurewebsites.net
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=$npm_package_version
```

## 🚀 Step 4: Deployment Commands

### 4.1 Manual Backend Deployment

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install --production

# Create deployment package
zip -r backend-deploy.zip . -x "node_modules/*" "logs/*" "*.log"

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group SurveyAggregator-RG \
  --name survey-aggregator-backend \
  --src backend-deploy.zip
```

### 4.2 Manual Frontend Deployment

```bash
# Build the React app
npm run build

# Deploy to Static Web Apps
az staticwebapp create \
  --name survey-aggregator-frontend \
  --resource-group SurveyAggregator-RG \
  --location eastus \
  --source . \
  --branch main \
  --app-location "/" \
  --output-location "build"
```

## 🔍 Step 5: Monitoring and Logging

### 5.1 Application Insights Setup

```bash
# Create Application Insights
az monitor app-insights component create \
  --app survey-aggregator-insights \
  --location eastus \
  --resource-group SurveyAggregator-RG \
  --application-type web

# Get instrumentation key
az monitor app-insights component show \
  --app survey-aggregator-insights \
  --resource-group SurveyAggregator-RG \
  --query instrumentationKey
```

### 5.2 Configure Logging

Add to backend `server.js`:

```javascript
const appInsights = require('applicationinsights');
appInsights.setup('YOUR_INSTRUMENTATION_KEY');
appInsights.start();
```

## 🔒 Step 6: Security Configuration

### 6.1 CORS Configuration

Update backend CORS settings:

```javascript
const corsOptions = {
  origin: [
    'https://survey-aggregator-frontend.azurestaticapps.net',
    'http://localhost:3000' // for development
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### 6.2 Azure Key Vault Integration

```bash
# Create Key Vault
az keyvault create \
  --name survey-aggregator-kv \
  --resource-group SurveyAggregator-RG \
  --location eastus

# Store database password
az keyvault secret set \
  --vault-name survey-aggregator-kv \
  --name "AZURE-SQL-PASSWORD" \
  --value "YourStrongPassword123!"

# Grant App Service access to Key Vault
az keyvault set-policy \
  --name survey-aggregator-kv \
  --spn $APP_SERVICE_PRINCIPAL_ID \
  --secret-permissions get list
```

## 📊 Step 7: Performance Optimization

### 7.1 Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX IX_survey_data_specialty ON survey_data(specialty);
CREATE INDEX IX_survey_data_providerType ON survey_data(providerType);
CREATE INDEX IX_survey_data_region ON survey_data(region);
CREATE INDEX IX_survey_data_surveyId ON survey_data(surveyId);
```

### 7.2 CDN Configuration

```bash
# Enable CDN for Static Web Apps
az cdn profile create \
  --name survey-aggregator-cdn \
  --resource-group SurveyAggregator-RG \
  --location eastus \
  --sku Standard_Microsoft

# Add CDN endpoint
az cdn endpoint create \
  --name survey-aggregator \
  --profile-name survey-aggregator-cdn \
  --resource-group SurveyAggregator-RG \
  --origin survey-aggregator-frontend.azurestaticapps.net \
  --origin-host-header survey-aggregator-frontend.azurestaticapps.net
```

## 🧪 Step 8: Testing Deployment

### 8.1 Health Check

```bash
# Test backend health
curl https://survey-aggregator-backend.azurewebsites.net/api/health

# Test frontend
curl https://survey-aggregator-frontend.azurestaticapps.net
```

### 8.2 Database Connection Test

```bash
# Test database connection
curl https://survey-aggregator-backend.azurewebsites.net/api/test-db
```

## 🔄 Step 9: Continuous Monitoring

### 9.1 Set up Alerts

```bash
# Create alert for high CPU usage
az monitor metrics alert create \
  --name "High CPU Alert" \
  --resource-group SurveyAggregator-RG \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/SurveyAggregator-RG/providers/Microsoft.Web/sites/survey-aggregator-backend \
  --condition "avg Percentage CPU > 80" \
  --description "Alert when CPU usage exceeds 80%"
```

### 9.2 Log Analytics

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group SurveyAggregator-RG \
  --workspace-name survey-aggregator-logs
```

## 📈 Step 10: Scaling Configuration

### 10.1 Auto-scaling Rules

```bash
# Enable auto-scaling for backend
az monitor autoscale create \
  --resource-group SurveyAggregator-RG \
  --resource /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/SurveyAggregator-RG/providers/Microsoft.Web/serverfarms/SurveyAggregator-Backend-Plan \
  --resource-type Microsoft.Web/serverfarms \
  --name SurveyAggregator-AutoScale \
  --min-count 1 \
  --max-count 3 \
  --count 1
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS origin includes your frontend URL
2. **Database Connection**: Check firewall rules and connection string
3. **Build Failures**: Verify Node.js version and dependencies
4. **Deployment Failures**: Check Azure credentials and permissions

### Debug Commands

```bash
# Check app service logs
az webapp log tail --name survey-aggregator-backend --resource-group SurveyAggregator-RG

# Check static web app logs
az staticwebapp show --name survey-aggregator-frontend --resource-group SurveyAggregator-RG

# Test database connection
az sql db show --name SurveyAggregator --server survey-aggregator-server --resource-group SurveyAggregator-RG
```

## 📚 Additional Resources

- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure Static Web Apps](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure SQL Database](https://docs.microsoft.com/en-us/azure/azure-sql/)
- [Azure DevOps Pipelines](https://docs.microsoft.com/en-us/azure/devops/pipelines/)

## 🎯 Success Metrics

- **Deployment Time**: < 5 minutes
- **Uptime**: > 99.9%
- **Response Time**: < 200ms
- **Error Rate**: < 0.1%
- **Cost**: < $100/month for development

---

**Next Steps**: After deployment, set up monitoring, alerts, and performance optimization based on real usage patterns.

