Write-Host "Starting npm install..."
cd 'D:\Hullu Ceramics\Gym\server'
npm install 2>&1 | Out-Host
Write-Host "Install complete. Starting server..."
node src/server.js 2>&1 | Out-Host