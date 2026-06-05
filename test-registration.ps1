$body = @{
    gymName = "Test Fitness Gym"
    ownerName = "Test User"
    email = "test$(Get-Random).@example.com"
    phone = "+251911234567"
    password = "test123456"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 10
    Write-Host "Registration SUCCESS:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Registration FAILED:"
    Write-Host $_.Exception.Message
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $reader.ReadToEnd()
}