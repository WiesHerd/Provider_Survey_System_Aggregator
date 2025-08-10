# Survey Aggregator Server Management Script
# Run this script to manage your backend server

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "kill")]
    [string]$Action = "status"
)

Write-Host "Survey Aggregator Server Management" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

switch ($Action) {
    "start" {
        Write-Host "Starting server with PM2..." -ForegroundColor Green
        npm run pm2:start
        Write-Host "Server started! Check status with: .\manage-server.ps1 status" -ForegroundColor Green
    }
    "stop" {
        Write-Host "Stopping server..." -ForegroundColor Yellow
        npm run pm2:stop
        Write-Host "Server stopped!" -ForegroundColor Green
    }
    "restart" {
        Write-Host "Restarting server..." -ForegroundColor Yellow
        npm run pm2:restart
        Write-Host "Server restarted!" -ForegroundColor Green
    }
    "status" {
        Write-Host "Server Status:" -ForegroundColor Blue
        npm run pm2:status
        Write-Host ""
        Write-Host "Testing API connection..." -ForegroundColor Blue
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/surveys" -UseBasicParsing -TimeoutSec 5
            Write-Host "API is responding (Status: $($response.StatusCode))" -ForegroundColor Green
        } catch {
            Write-Host "API is not responding" -ForegroundColor Red
        }
    }
    "logs" {
        Write-Host "Server Logs:" -ForegroundColor Blue
        npm run pm2:logs
    }
    "kill" {
        Write-Host "Force killing all Node processes..." -ForegroundColor Red
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
        Write-Host "All Node processes killed!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  .\manage-server.ps1 start    - Start the server" -ForegroundColor White
Write-Host "  .\manage-server.ps1 stop     - Stop the server" -ForegroundColor White
Write-Host "  .\manage-server.ps1 restart  - Restart the server" -ForegroundColor White
Write-Host "  .\manage-server.ps1 status   - Check server status" -ForegroundColor White
Write-Host "  .\manage-server.ps1 logs     - View server logs" -ForegroundColor White
Write-Host "  .\manage-server.ps1 kill     - Force kill all Node processes" -ForegroundColor White
