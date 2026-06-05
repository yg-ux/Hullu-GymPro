$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRiYThjY2E4LTMwZDUtNGM0OC05YmM3LWUzOTNiYjBiNDI4ZCIsImd5bV9pZCI6ImYyNTM4NDg4LWMxNGEtNDZiZC1hOGExLWFjYzlmODNjMjg3OSIsInVzZXJuYW1lIjoidGVzdDM3OTczNjYyNy5AZXhhbXBsZS5jb20iLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3ODA1OTMyMzAsImV4cCI6MTc4MTE5ODAzMH0.MXubRkr-6E39-T0BBbvwZ4VD4xNYrEj21Pkos7FtNT0"

$headers = @{Authorization="Bearer $token"}

Write-Host "=== Testing Additional Endpoints ===" -ForegroundColor Cyan

# Test revenue endpoint
Write-Host "`n[5] GET /api/revenue"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/revenue" -Headers $headers -TimeoutSec 10
    Write-Host "SUCCESS" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test attendance/checkin
Write-Host "`n[6] POST /api/attendance/check-in"
$checkin = @{ phone = "+251911234568" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/attendance/check-in" -Method Post -ContentType "application/json" -Headers $headers -Body $checkin -TimeoutSec 10
    Write-Host "SUCCESS" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test attendance/checkout
Write-Host "`n[7] POST /api/attendance/check-out"
$checkout = @{ phone = "+251911234568" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/attendance/check-out" -Method Post -ContentType "application/json" -Headers $headers -Body $checkout -TimeoutSec 10
    Write-Host "SUCCESS" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test attendance/current
Write-Host "`n[8] GET /api/attendance/current"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/attendance/current" -Headers $headers -TimeoutSec 10
    Write-Host "SUCCESS - Currently checked in: $($response.checkedIn.Count)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test staff endpoint
Write-Host "`n[9] GET /api/staff"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/staff" -Headers $headers -TimeoutSec 10
    Write-Host "SUCCESS - Staff count: $($response.staff.Count)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test reports endpoint
Write-Host "`n[10] GET /api/stats/reports"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/stats/reports" -Headers $headers -TimeoutSec 10
    Write-Host "SUCCESS" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan