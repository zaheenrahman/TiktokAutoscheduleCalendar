# 🪟 Windows Setup (No Docker)

Easier than Docker on Windows. Just run these in separate PowerShell windows.

## Prerequisites

```powershell
# 1. Install Redis (if not already)
choco install redis-64

# Or download from:
# https://github.com/microsoftarchive/redis/releases

# 2. Check Python & Node
python --version  # Should be 3.11+
node --version    # Should be 20+
```

## Setup (One Time)

### Backend Setup
```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup
```powershell
cd frontend

# Install dependencies
npm install
```

## Running (Every Time)

Open **4 separate PowerShell windows**:

### Window 1: Redis
```powershell
redis-server
```
Should show: `Ready to accept connections`

### Window 2: Backend API
```powershell
cd backend
.\venv\Scripts\activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Should show: `Application startup complete`

### Window 3: Celery Worker
```powershell
cd backend
.\venv\Scripts\activate

# Windows needs eventlet
pip install eventlet

# Run worker
celery -A tasks worker --loglevel=info --pool=solo
```

**Note**: Celery doesn't fully support Windows. If this fails, uploads won't auto-schedule. You can still use the app manually.

### Window 4: Frontend
```powershell
cd frontend
npm run dev
```
Should show: `Local: http://localhost:3000`

## Open App

Go to: **http://localhost:3000**

## Test It

1. **Upload a test video** - drag & drop into the app
2. **Schedule it** - click calendar icon, set time 5 minutes from now
3. **Check status** - watch calendar for color changes

## If Celery Won't Work on Windows

### Option A: Manual uploads
Just test uploads directly without scheduling:

```powershell
cd tiktok-uploader
uv run python test_upload.py
```

### Option B: Use WSL2
```bash
# In WSL terminal
cd /mnt/c/Users/zaheen/TiktokScheduler/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
celery -A tasks worker --loglevel=info --beat
```

### Option C: Docker just for Celery
```powershell
# Start only Redis + Celery in Docker
docker-compose up redis celery -d

# Then run backend/frontend manually (Windows 2 & 4 above)
```

## Stopping Everything

Press `Ctrl+C` in each window, or:

```powershell
# Kill all Python
Get-Process python | Stop-Process -Force

# Kill Node
Get-Process node | Stop-Process -Force

# Kill Redis
Get-Process redis-server | Stop-Process -Force
```

## Troubleshooting

### Port already in use
```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill it
taskkill /PID <PID_NUMBER> /F
```

### Backend can't find tiktok-uploader
Make sure your folder structure is:
```
TiktokScheduler/
├── backend/
├── frontend/
└── tiktok-uploader/
    └── tiktok_only_cookies.txt  ← IMPORTANT
```

### "No module named 'tiktok_uploader'"
The Celery task needs the path. Update `backend/tasks.py` if needed:

```python
# Line 9-10
TIKTOK_UPLOADER_PATH = Path(__file__).parent.parent / "tiktok-uploader" / "src"
sys.path.insert(0, str(TIKTOK_UPLOADER_PATH))
```

## Quick Start Script

Save this as `start.ps1`:

```powershell
# Start Redis
Start-Process powershell -ArgumentList "-NoExit", "-Command", "redis-server"

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; python -m uvicorn main:app --reload"

# Start Celery (optional, might fail on Windows)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; celery -A tasks worker --loglevel=info --pool=solo"

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "All services starting..."
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend: http://localhost:8000"
```

Run it:
```powershell
.\start.ps1
```

