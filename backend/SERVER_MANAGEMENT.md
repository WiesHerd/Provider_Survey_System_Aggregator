# Server Management Guide

## 🚀 **No More Manual Restarts!**

Your server now runs with **PM2** - a production process manager that automatically restarts the server if it crashes.

## 📋 **Quick Commands**

### **Check Server Status**
```powershell
.\manage-server.ps1 status
```

### **Start Server**
```powershell
.\manage-server.ps1 start
```

### **Restart Server**
```powershell
.\manage-server.ps1 restart
```

### **Stop Server**
```powershell
.\manage-server.ps1 stop
```

### **View Logs**
```powershell
.\manage-server.ps1 logs
```

### **Force Kill All Node Processes**
```powershell
.\manage-server.ps1 kill
```

## 🔧 **What's Fixed**

### **1. Auto-Restart on Crash**
- Server automatically restarts if it crashes
- No more manual intervention needed
- PM2 monitors the process 24/7

### **2. Robust Azure SQL Integration**
- Azure SQL connection failures won't crash the server
- Graceful fallback to SQLite if Azure is unavailable
- Your data is safe in both databases

### **3. Better Error Handling**
- Server logs all errors to `./logs/` directory
- Detailed error tracking for debugging
- Graceful degradation when services fail

### **4. Production-Ready**
- Memory limits and restart policies
- Process monitoring and health checks
- Automatic recovery from failures

## 📊 **Monitoring**

### **Check PM2 Status**
```bash
npm run pm2:status
```

### **View Real-time Logs**
```bash
npm run pm2:logs
```

### **Monitor Resources**
```bash
pm2 monit
```

## 🗄️ **Database Strategy**

### **Dual-Write System**
- **Primary**: SQLite (local, fast, reliable)
- **Secondary**: Azure SQL (cloud, persistent, accessible from anywhere)
- **Fallback**: If Azure fails, data still saves to SQLite

### **Data Persistence**
- Your survey data is stored in **both** databases
- Even if the server crashes, your data is safe
- Azure SQL provides cloud backup and accessibility

## 🚨 **Troubleshooting**

### **Server Won't Start**
1. Check logs: `.\manage-server.ps1 logs`
2. Kill all processes: `.\manage-server.ps1 kill`
3. Restart: `.\manage-server.ps1 start`

### **Azure SQL Issues**
1. Check `backend/env.local` for correct credentials
2. Set `ENABLE_AZURE_SQL=false` to use SQLite only
3. Restart server: `.\manage-server.ps1 restart`

### **Port Already in Use**
1. Kill processes: `.\manage-server.ps1 kill`
2. Wait 5 seconds
3. Start server: `.\manage-server.ps1 start`

## 📁 **File Structure**

```
backend/
├── server.js              # Main server file
├── ecosystem.config.js    # PM2 configuration
├── manage-server.ps1      # Management script
├── logs/                  # Log files
│   ├── err.log           # Error logs
│   ├── out.log           # Output logs
│   └── combined.log      # Combined logs
└── env.local             # Environment variables
```

## 🎯 **Benefits**

✅ **No more manual restarts**  
✅ **Automatic crash recovery**  
✅ **Data persistence in Azure SQL**  
✅ **Easy server management**  
✅ **Production-ready stability**  
✅ **Comprehensive logging**  

## 🔄 **Next Steps**

1. **Test the system**: Upload a survey and verify it appears in both databases
2. **Monitor performance**: Use `.\manage-server.ps1 status` to check server health
3. **Set up monitoring**: Consider setting up alerts for server restarts

Your server is now **enterprise-grade** and will keep running reliably! 🚀
