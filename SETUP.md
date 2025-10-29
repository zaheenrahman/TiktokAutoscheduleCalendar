# 🚀 Setup Guide

## Step-by-Step Installation

### 1. Get TikTok Cookies

**IMPORTANT**: You need your TikTok session cookies first.

1. Install browser extension: [Get cookies.txt LOCALLY](https://github.com/kairi003/Get-cookies.txt-LOCALLY)
2. Go to [tiktok.com](https://tiktok.com) and log in
3. Click the extension icon
4. Click "Export As" → Save file
5. Filter only TikTok cookies (see below)

**Create `tiktok-uploader/tiktok_only_cookies.txt`:**

```bash
cd tiktok-uploader
grep "tiktok\.com" /path/to/your/cookies.txt > tiktok_only_cookies.txt
```

Or manually create with this format:
```
# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file! Do not edit.

.tiktok.com	TRUE	/	TRUE	1777249773	sessionid	YOUR_SESSION_ID_HERE
.tiktok.com	TRUE	/	TRUE	1777249773	sid_tt	YOUR_SID_HERE
... (other TikTok cookies)
```

### 2. Choose Your Setup Method

#### Option A: Docker (Easiest)

```bash
# Start everything
docker-compose up -d

# Check logs
docker-compose logs -f

# Access app
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

#### Option B: Manual Setup

**Terminal 1 - Redis:**
```bash
# Install Redis first (Windows: https://redis.io/docs/install/)
redis-server
```

**Terminal 2 - Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI
uvicorn main:app --reload
```

**Terminal 3 - Celery Worker:**
```bash
cd backend
venv\Scripts\activate  # or: source venv/bin/activate

celery -A tasks worker --loglevel=info --beat
```

**Terminal 4 - Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 3. Test Upload

1. Go to http://localhost:3000
2. Drag a video into the upload area
3. Wait for AI description
4. Click calendar icon
5. Set date/time (must be in the future)
6. Click "Schedule"
7. Watch calendar for status updates

### 4. First Test (Manual)

Before scheduling, test manually:

```bash
cd tiktok-uploader
uv run python test_upload.py
```

Watch the browser window. If you see errors:
- Regenerate cookies (they expire)
- Check TikTok isn't rate-limiting you
- Try again in a few hours

## Common Issues

### "Failed to add cookie"
- **Solution**: Your cookies file has non-TikTok cookies. Filter to only TikTok domains.

### "Unable to locate element"
- **Solution**: TikTok changed their UI. Check for tiktok-uploader updates or wait for a fix.

### "Schedule not uploading"
- **Solution**: 
  1. Check Celery worker is running: `docker-compose logs celery`
  2. Check Redis is running: `redis-cli ping` (should return "PONG")
  3. Check cookies are still valid

### Port already in use
```bash
# Kill process on port
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill -9
```

### Frontend can't connect to backend
- Check backend is running: http://localhost:8000
- Check CORS settings in `backend/main.py`
- Try restarting both frontend and backend

## Windows-Specific Setup

### Install Redis

```powershell
# Using Chocolatey
choco install redis-64

# Or download MSI from:
# https://github.com/microsoftarchive/redis/releases
```

### Path Issues

If Python packages aren't found:
```powershell
# Add to Path temporarily
$env:PYTHONPATH="C:\Users\zaheen\TiktokScheduler\tiktok-uploader\src;$env:PYTHONPATH"
```

### Celery on Windows

Celery doesn't support Windows well. Use Docker or WSL2:

```bash
# Option 1: Use Docker
docker-compose up celery

# Option 2: Use WSL2
wsl
cd /mnt/c/Users/zaheen/TiktokScheduler/backend
celery -A tasks worker --loglevel=info --beat
```

## Production Deployment

### Environment Variables

Create `backend/.env`:
```bash
DATABASE_URL=postgresql://user:pass@localhost/tiktok_scheduler
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
```

### Use PostgreSQL

Update `backend/database.py`:
```python
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://user:pass@localhost/tiktok_scheduler"
)
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api {
        proxy_pass http://localhost:8000;
    }
}
```

### PM2 for Process Management

```bash
npm install -g pm2

# Backend
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name tiktok-api

# Celery
pm2 start "celery -A tasks worker --loglevel=info --beat" --name tiktok-worker

# Frontend (build first)
cd frontend && npm run build
pm2 start "npm run preview" --name tiktok-frontend
```

## Next Steps

1. ✅ Test manual upload
2. ✅ Upload a video via UI
3. ✅ Schedule a test post (5 minutes from now)
4. ✅ Monitor calendar for status change
5. 🎉 Profit

## Need Help?

- Backend logs: `docker-compose logs backend`
- Celery logs: `docker-compose logs celery`
- Frontend logs: Browser console (F12)
- Database: `sqlite3 backend/tiktok_scheduler.db`

