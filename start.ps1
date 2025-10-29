# TikTok Scheduler - Windows Launcher

Write-Host "🚀 Starting TikTok Scheduler..." -ForegroundColor Green
Write-Host ""

# Check if Redis is installed
if (-not (Get-Command redis-server -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Redis not found. Install with: choco install redis-64" -ForegroundColor Red
    exit
}

# Check if backend venv exists
if (-not (Test-Path "backend\venv")) {
    Write-Host "❌ Backend not set up. Run: cd backend && python -m venv venv && .\venv\Scripts\activate && pip install -r requirements.txt" -ForegroundColor Red
    exit
}

# Check if frontend node_modules exists
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "❌ Frontend not set up. Run: cd frontend && npm install" -ForegroundColor Red
    exit
}

# Start Redis
Write-Host "Starting Redis..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "redis-server"
Start-Sleep -Seconds 2

# Start Backend
Write-Host "Starting Backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
Start-Sleep -Seconds 3

# Start Celery (with warning)
Write-Host "Starting Celery Worker (may not work on Windows)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; pip install eventlet -q; celery -A tasks worker --loglevel=info --pool=solo"
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop services" -ForegroundColor Gray

