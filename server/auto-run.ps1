# Auto-run server script
$ErrorActionPreference = "Continue"
$start = Get-Date
$logFile = "D:\Hullu Ceramics\Gym\server\autostart.log"

# Wait for npm install to complete (check if node_modules is populated)
$maxWait = 300  # 5 minutes max
$waited = 0
$checkInterval = 5

while ($waited -lt $maxWait) {
    $uuidPath = "D:\Hullu Ceramics\Gym\server\node_modules\uuid\package.json"
    if (Test-Path $uuidPath) {
        Write-Host "Dependencies ready after $waited seconds"
        break
    }
    Start-Sleep -Seconds $checkInterval
    $waited += $checkInterval
}

# Start server
Write-Host "Starting server..."
cd "D:\Hullu Ceramics\Gym\server"
$env:NODE_ENV = "development"
node src/server.js 2>&1 | Tee-Object -FilePath $logFile