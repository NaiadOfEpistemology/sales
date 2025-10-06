# Ruby Auto Parts Development Server
Write-Host "Starting Ruby Auto Parts Development Server..." -ForegroundColor Green
Write-Host "Server will run at http://localhost:5173/" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

# Start npm in background
$job = Start-Job -ScriptBlock { 
    Set-Location "C:\nigga1\sales"
    npm run dev 
}

Write-Host "Server started in background. Job ID: $($job.Id)" -ForegroundColor Green
Write-Host "To stop the server, run: Stop-Job $($job.Id)" -ForegroundColor Yellow

# Keep the script running
try {
    while ($job.State -eq "Running") {
        Start-Sleep -Seconds 5
    }
} finally {
    Stop-Job $job
    Remove-Job $job
    Write-Host "Server stopped." -ForegroundColor Red
}
