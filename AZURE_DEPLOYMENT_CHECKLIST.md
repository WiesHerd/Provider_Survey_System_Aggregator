# 🚀 Azure Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Azure CLI Setup
- [ ] Azure CLI installed (`az --version`)
- [ ] Logged in to Azure (`az login`)
- [ ] Correct subscription selected (`az account show`)

### 2. GitHub Repository Setup
- [ ] Repository is public or has proper access
- [ ] GitHub Actions enabled
- [ ] Repository secrets configured (see below)

### 3. Environment Variables
- [ ] Backend environment variables configured
- [ ] Frontend environment variables configured
- [ ] Database credentials secured

## 🔐 GitHub Repository Secrets

Add these secrets in your GitHub repository (Settings > Secrets and variables > Actions):

### Required Secrets
```
AZURE_WEBAPP_PUBLISH_PROFILE=<publish-profile-from-azure>
AZURE_STATIC_WEB_APPS_API_TOKEN=<token-from-static-web-app>
REACT_APP_API_URL=https://survey-aggregator-backend.azurewebsites.net
```

### How to Get Secrets

#### 1. AZURE_WEBAPP_PUBLISH_PROFILE
```bash
# Get publish profile for backend
az webapp deployment list-publishing-profiles \
  --name survey-aggregator-backend \
  --resource-group SurveyAggregator-RG \
  --xml
```

#### 2. AZURE_STATIC_WEB_APPS_API_TOKEN
```bash
# Get deployment token for static web app
az staticwebapp secrets list \
  --name survey-aggregator-frontend \
  --resource-group SurveyAggregator-RG
```

## 🚀 Deployment Steps

### Option 1: Automated Deployment (Recommended)

1. **Run the deployment script:**
   ```powershell
   .\deploy-to-azure.ps1 -SqlAdminPassword "YourStrongPassword123!"
   ```

2. **Configure GitHub secrets** (see above)

3. **Push to main branch** to trigger deployment:
   ```bash
   git add .
   git commit -m "Deploy to Azure"
   git push origin main
   ```

### Option 2: Manual Deployment

1. **Create Azure resources:**
   ```bash
   # Follow steps in azure-deployment-guide.md
   ```

2. **Deploy backend:**
   ```bash
   cd backend
   npm install --production
   zip -r backend-deploy.zip . -x "node_modules/*" "logs/*" "*.log"
   az webapp deployment source config-zip \
     --resource-group SurveyAggregator-RG \
     --name survey-aggregator-backend \
     --src backend-deploy.zip
   ```

3. **Deploy frontend:**
   ```bash
   npm run build
   # Upload build folder to Azure Static Web Apps
   ```

## 🧪 Post-Deployment Testing

### 1. Health Checks
- [ ] Backend health: `https://survey-aggregator-backend.azurewebsites.net/api/health`
- [ ] Frontend: `https://survey-aggregator-frontend.azurestaticapps.net`
- [ ] Database connection: `https://survey-aggregator-backend.azurewebsites.net/api/test-db`

### 2. Functionality Tests
- [ ] Survey upload works
- [ ] Analytics display correctly
- [ ] Regional analytics function
- [ ] FMV calculator works
- [ ] Specialty mapping works

### 3. Performance Tests
- [ ] Page load times < 3 seconds
- [ ] API response times < 200ms
- [ ] File uploads work (up to 10MB)

## 🔍 Monitoring Setup

### 1. Application Insights
- [ ] Application Insights created
- [ ] Instrumentation key configured
- [ ] Custom events tracked

### 2. Alerts
- [ ] High CPU usage alert
- [ ] High memory usage alert
- [ ] Error rate alert
- [ ] Response time alert

### 3. Logging
- [ ] Log Analytics workspace created
- [ ] Log queries configured
- [ ] Dashboard created

## 🔒 Security Configuration

### 1. CORS Settings
- [ ] CORS origin configured for frontend URL
- [ ] Development origins allowed for testing

### 2. Authentication (Optional)
- [ ] Azure AD authentication configured
- [ ] User roles and permissions set

### 3. Network Security
- [ ] Private endpoints configured (if needed)
- [ ] VNet integration (if needed)

## 📊 Performance Optimization

### 1. Database
- [ ] Indexes created on frequently queried columns
- [ ] Query performance optimized
- [ ] Connection pooling configured

### 2. CDN
- [ ] CDN enabled for static assets
- [ ] Cache headers configured
- [ ] Compression enabled

### 3. Application
- [ ] Bundle size optimized
- [ ] Lazy loading implemented
- [ ] Image optimization applied

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS origin configuration
   - Verify frontend URL is correct

2. **Database Connection Failures**
   - Check firewall rules
   - Verify connection string
   - Check credentials

3. **Build Failures**
   - Check Node.js version
   - Verify dependencies
   - Check environment variables

4. **Deployment Failures**
   - Check Azure credentials
   - Verify resource permissions
   - Check GitHub secrets

### Debug Commands

```bash
# Check app service logs
az webapp log tail --name survey-aggregator-backend --resource-group SurveyAggregator-RG

# Check static web app status
az staticwebapp show --name survey-aggregator-frontend --resource-group SurveyAggregator-RG

# Test database connection
az sql db show --name SurveyAggregator --server survey-aggregator-server --resource-group SurveyAggregator-RG
```

## 📈 Success Metrics

- [ ] **Uptime**: > 99.9%
- [ ] **Response Time**: < 200ms
- [ ] **Error Rate**: < 0.1%
- [ ] **Deployment Time**: < 5 minutes
- [ ] **Cost**: < $100/month

## 📞 Support

If you encounter issues:
1. Check Azure status page
2. Review application logs
3. Test locally first
4. Contact Azure support if needed

---

**Remember**: Always test in a staging environment before deploying to production!








