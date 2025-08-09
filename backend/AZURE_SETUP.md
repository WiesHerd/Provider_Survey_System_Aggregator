# 🚀 Azure SQL Database Setup Guide

This guide will help you set up Azure SQL Database for your Survey Aggregator application.

## 📋 Prerequisites

- Azure subscription
- Azure CLI installed and configured
- Node.js 18+ and npm

## 🔧 Step 1: Create Azure SQL Database

### Option A: Using Azure Portal

1. **Go to Azure Portal**: https://portal.azure.com
2. **Create Resource** → Search for "SQL Database"
3. **Fill in the basics**:
   - **Resource group**: Create new or use existing
   - **Database name**: `SurveyAggregator`
   - **Server**: Create new server
     - **Server name**: `survey-aggregator-server` (must be unique globally)
     - **Location**: Choose closest to you
     - **Authentication method**: SQL authentication
     - **Admin username**: `surveyadmin`
     - **Password**: Create a strong password
   - **Compute + storage**: Basic (5 DTUs, 2 GB) for development
4. **Click "Review + create"** → **Create**

### Option B: Using Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name SurveyAggregator --location eastus

# Create SQL Server
az sql server create \
  --name survey-aggregator-server \
  --resource-group SurveyAggregator \
  --location eastus \
  --admin-user surveyadmin \
  --admin-password "YourStrongPassword123!"

# Create SQL Database
az sql db create \
  --resource-group SurveyAggregator \
  --server survey-aggregator-server \
  --name SurveyAggregator \
  --edition Basic \
  --capacity 5

# Configure firewall rule (allow your IP)
az sql server firewall-rule create \
  --resource-group SurveyAggregator \
  --server survey-aggregator-server \
  --name AllowMyIP \
  --start-ip-address YOUR_IP_ADDRESS \
  --end-ip-address YOUR_IP_ADDRESS
```

## 🔐 Step 2: Get Connection Details

After creation, note down:
- **Server name**: `survey-aggregator-server.database.windows.net`
- **Database name**: `SurveyAggregator`
- **Username**: `surveyadmin`
- **Password**: The password you created

## 📝 Step 3: Configure Environment Variables

1. **Copy the environment template**:
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file** with your Azure credentials:
   ```env
   # Azure SQL Database Configuration
   AZURE_SQL_SERVER=survey-aggregator-server.database.windows.net
   AZURE_SQL_DATABASE=SurveyAggregator
   AZURE_SQL_USER=surveyadmin
   AZURE_SQL_PASSWORD=YourStrongPassword123!
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   ```

## 🚀 Step 4: Test the Connection

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm run dev
   ```

3. **Check the logs** - you should see:
   ```
   🔌 Connecting to Azure SQL Database...
   ✅ Connected to Azure SQL Database
   🏗️ Creating database tables...
   ✅ Database tables created successfully
   ✅ Database initialized successfully
   🚀 Survey Aggregator Backend running on port 3001
   📊 Database: Azure SQL Database
   ```

## 🔍 Step 5: Test API Endpoints

1. **Health check**:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Upload a survey** (using Postman or curl):
   ```bash
   curl -X POST http://localhost:3001/api/upload \
     -F "survey=@sample-survey.csv" \
     -F "name=Test Survey" \
     -F "year=2024" \
     -F "type=Compensation"
   ```

## 🛠️ Troubleshooting

### Connection Issues

1. **Firewall Rule**: Ensure your IP is allowed in Azure SQL Server firewall
2. **Credentials**: Double-check username/password
3. **Server Name**: Use full server name with `.database.windows.net`

### Common Errors

- **Login failed**: Check username/password
- **Server not found**: Verify server name
- **Connection timeout**: Check firewall rules
- **Encryption error**: Ensure `encrypt: true` in config

### Debug Mode

```bash
# Enable detailed logging
DEBUG=mssql* npm run dev
```

## 🔒 Security Best Practices

1. **Use Azure Key Vault** for storing credentials
2. **Enable Azure AD authentication** instead of SQL auth
3. **Use Private Endpoints** for production
4. **Enable Advanced Threat Protection**
5. **Regular security audits**

## 📊 Performance Optimization

1. **Connection Pooling**: Already configured (max 10 connections)
2. **Indexes**: Add indexes on frequently queried columns
3. **Query Optimization**: Use parameterized queries (already implemented)
4. **Monitoring**: Use Azure SQL Analytics

## 🚀 Production Deployment

1. **Scale up**: Increase DTUs/cores as needed
2. **Backup**: Enable automated backups
3. **Monitoring**: Set up alerts and monitoring
4. **Security**: Enable Azure AD authentication
5. **Networking**: Use Private Endpoints

## 📚 Additional Resources

- [Azure SQL Database Documentation](https://docs.microsoft.com/en-us/azure/azure-sql/)
- [Node.js MSSQL Driver](https://github.com/tediousjs/node-mssql)
- [Azure SQL Best Practices](https://docs.microsoft.com/en-us/azure/azure-sql/database/performance-guidance)
- [Azure CLI SQL Commands](https://docs.microsoft.com/en-us/cli/azure/sql)

## 🆘 Support

If you encounter issues:
1. Check Azure SQL Database status
2. Review firewall rules
3. Verify connection string
4. Check Azure SQL logs
5. Contact Azure support if needed

