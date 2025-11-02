# Survey Aggregator - Complete Backup Script
# This script backs up your project and Cursor chat history to OneDrive

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Survey Aggregator Backup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define paths
$projectPath = "C:\Users\wherd\PythonProjects\Survey_Aggregator"
$oneDriveBase = $env:OneDrive
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$backupRoot = Join-Path $oneDriveBase "Backups\Survey_Aggregator_$timestamp"
$projectBackup = Join-Path $backupRoot "Project"
$cursorBackup = Join-Path $backupRoot "Cursor_Backup"

# Check if OneDrive is available
if (-not (Test-Path $oneDriveBase)) {
    Write-Host "ERROR: OneDrive path not found at: $oneDriveBase" -ForegroundColor Red
    Write-Host "Please verify OneDrive is installed and synced." -ForegroundColor Yellow
    pause
    exit 1
}

# Check if project exists
if (-not (Test-Path $projectPath)) {
    Write-Host "ERROR: Project not found at: $projectPath" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Backup Destination: $backupRoot" -ForegroundColor Green
Write-Host ""

# Create backup directories
Write-Host "Creating backup directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $projectBackup | Out-Null
New-Item -ItemType Directory -Force -Path $cursorBackup | Out-Null

# Backup Project using robocopy
Write-Host ""
Write-Host "Backing up project code (excluding node_modules and build)..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

$robocopyArgs = "/E /XD node_modules build .next dist /XF *.zip *.log *.cache /R:3 /W:5 /NFL /NDL /NJH /NJS"
$robocopyResult = cmd /c "robocopy `"$projectPath`" `"$projectBackup`" $robocopyArgs"

if ($LASTEXITCODE -le 1) {
    Write-Host "✓ Project backup complete!" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: Some files may not have copied. Exit code: $LASTEXITCODE" -ForegroundColor Yellow
}

# Backup Cursor Chat History
Write-Host ""
Write-Host "Backing up Cursor chat history and settings..." -ForegroundColor Yellow
$cursorAppData = "$env:APPDATA\Cursor"

if (Test-Path $cursorAppData) {
    $robocopyResult = cmd /c "robocopy `"$cursorAppData`" `"$cursorBackup`" /E /R:3 /W:5 /NFL /NDL /NJH /NJS"
    
    if ($LASTEXITCODE -le 1) {
        Write-Host "✓ Cursor backup complete!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Warning: Cursor backup may be incomplete. Exit code: $LASTEXITCODE" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Warning: Cursor AppData not found at: $cursorAppData" -ForegroundColor Yellow
    Write-Host "   Chat history may be stored elsewhere or Cursor not installed." -ForegroundColor Gray
}

# Create restore instructions file
Write-Host ""
Write-Host "Creating restore instructions..." -ForegroundColor Yellow

$restoreInstructions = @"
# Survey Aggregator - Restore Instructions
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Backup Location: $backupRoot

## After Windows Reinstall:

1. Install Node.js and npm
   - Download from: https://nodejs.org/
   - Install LTS version

2. Install Git
   - Download from: https://git-scm.com/
   - Or use: winget install Git.Git

3. Install Cursor
   - Download from: https://cursor.sh/
   - Install normally

4. Restore Project:
   - Copy the Project folder from this backup to: C:\Users\wherd\PythonProjects\Survey_Aggregator
   - Open PowerShell in the project folder
   - Run: npm install
   - Verify: git status

5. Restore Cursor Chat History:
   - Close Cursor completely
   - Copy Cursor_Backup folder contents to: %APPDATA%\Cursor
   - Overwrite if prompted
   - Restart Cursor

6. Verify Everything Works:
   - Open project in Cursor
   - Check git status: git status
   - Check chat history appears
   - Run: npm start (to test)

## Backup Contents:
- Project Source Code (excluding node_modules)
- Git Repository (.git folder included)
- Cursor Chat History
- Cursor Settings

## Notes:
- node_modules was excluded (run npm install after restore)
- build folder was excluded (will be regenerated)
"@

$restoreInstructions | Out-File -FilePath (Join-Path $backupRoot "RESTORE_INSTRUCTIONS.txt") -Encoding UTF8

Write-Host "✓ Restore instructions saved!" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup Location: $backupRoot" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait for OneDrive to finish syncing (check system tray)" -ForegroundColor Gray
Write-Host "2. Verify backup exists in OneDrive online: https://onedrive.live.com" -ForegroundColor Gray
Write-Host "3. Check that RESTORE_INSTRUCTIONS.txt is in the backup folder" -ForegroundColor Gray
Write-Host ""
Write-Host "When you get your laptop back, see RESTORE_INSTRUCTIONS.txt" -ForegroundColor Cyan
Write-Host ""

# Calculate backup size
try {
    $backupSize = (Get-ChildItem -Path $backupRoot -Recurse -ErrorAction SilentlyContinue | 
        Measure-Object -Property Length -Sum).Sum / 1GB
    $backupSizeRounded = [math]::Round($backupSize, 2)
    Write-Host "Backup Size: $backupSizeRounded GB" -ForegroundColor White
} catch {
    Write-Host "Backup size calculation skipped" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
