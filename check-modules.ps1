Get-ChildItem 'D:\Hullu Ceramics\Gym\server\node_modules' -Directory | ForEach-Object { 
    $pkgJson = Join-Path $_.FullName 'package.json'
    if (-not (Test-Path $pkgJson)) { 
        Write-Host "MISSING: $($_.Name)" 
    }
}