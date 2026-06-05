$ErrorActionPreference = "Continue"
Write-Host "Starting backend server setup..."
cd "D:\Hullu Ceramics\Gym\server"
Write-Host "Installing dependencies..."
npm install
Write-Host "Starting server..."
node src/server.js