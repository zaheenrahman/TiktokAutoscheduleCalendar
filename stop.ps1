# Stop all TikTok Scheduler services

Write-Host "🛑 Stopping TikTok Scheduler services..." -ForegroundColor Yellow

# Stop Python processes (Backend & Celery)
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✓ Stopped Python processes" -ForegroundColor Green

# Stop Node (Frontend)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✓ Stopped Node processes" -ForegroundColor Green

# Stop Redis
Get-Process redis-server -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✓ Stopped Redis" -ForegroundColor Green

Write-Host ""
Write-Host "✅ All services stopped!" -ForegroundColor Green

