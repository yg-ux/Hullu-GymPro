$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRiYThjY2E4LTMwZDUtNGM0OC05YmM3LWUzOTNiYjBiNDI4ZCIsImd5bV9pZCI6ImYyNTM4NDg4LWMxNGEtNDZiZC1hOGExLWFjYzlmODNjMjg3OSIsInVzZXJuYW1lIjoidGVzdDM3OTczNjYyNy5AZXhhbXBsZS5jb20iLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3ODA1OTMyMzAsImV4cCI6MTc4MTE5ODAzMH0.MXubRkr-6E39-T0BBbvwZ4VD4xNYrEj21Pkos7FtNT0"

Write-Host "=== Testing API Endpoints ===" -ForegroundColor Cyan

# Test customers list
Write-Host "`n[1] GET /api/customers"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/customers" -Headers @{Authorization="Bearer $token"} -TimeoutSec 10
    Write-Host "SUCCESS - Customers: $($response.customers.Count)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test add customer
Write-Host "`n[2] POST /api/customers"
$customer = @{
    name = "John Doe"
    phone = "+251911234568"
    email = "john@example.com"
    membershipType = "1_month"
    amount = 3000
    paymentMethod = "cash"
} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/customers" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body $customer -TimeoutSec 10
    Write-Host "SUCCESS - Customer ID: $($response.customer.id)" -ForegroundColor Green
    $customerId = $response.customer.id
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $customerId = $null
}

# Test check-in
Write-Host "`n[3] POST /api/attendance/checkin"
$checkin = @{ phone = "+251911234568" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/attendance/checkin" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body $checkin -TimeoutSec 10
    Write-Host "SUCCESS - Checked in at: $($response.checkin.check_in_time)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test dashboard stats
Write-Host "`n[4] GET /api/dashboard/stats"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/dashboard/stats" -Headers @{Authorization="Bearer $token"} -TimeoutSec 10
    Write-Host "SUCCESS - Stats retrieved" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan