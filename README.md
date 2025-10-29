# 📱 TikTok Scheduler

Visual calendar + uploader for TikTok. Drag videos in, pick a time, and the app drives TikTok’s web uploader in a real Chrome window using Selenium.

## What’s inside
- 🎥 **Video library** – drag & drop upload area with auto-caption stub
- 📅 **Calendar scheduling** – React Big Calendar with local-time scheduling
- 🔁 **Auto retries** – uploads retried up to 3× if TikTok flakes
- ⚙️ **Backend** – FastAPI, SQLite, Selenium
- 💻 **Frontend** – React 18, Tailwind, TanStack Query

## Architecture
```
Frontend (React) ──▶ FastAPI backend ──▶ Selenium + Chrome ──▶ TikTok
                      │
                      └─▶ SQLite (videos + schedules)
```
A lightweight background thread polls every minute for due jobs; “Post Now” runs immediately. No Celery, no Redis, no Docker.

## Prereqs
- Python 3.11+
- Node 20+
- Google Chrome installed
- TikTok session cookies (see below)
- `tiktok-uploader` repo cloned beside this project:
  ```bash
  git clone https://github.com/wkaisertexas/tiktok-uploader tiktok-uploader
  ```

## Setup
### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # PowerShell (use source venv/bin/activate on mac/linux)
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
This starts FastAPI and the background scheduler. Selenium will launch Chrome in visible mode when uploads run.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Visit http://localhost:3000. The calendar will poll the backend every 10s for status updates.

## Usage
1. Export TikTok cookies with [Get cookies.txt LOCALLY](https://github.com/kairi003/Get-cookies.txt-LOCALLY) while logged in.
2. Keep only TikTok entries and save as `tiktok-uploader/tiktok_only_cookies.txt`.
3. In the UI:
   - Drag a clip into **Video Library**
   - Click **Post Now** for instant upload (runs immediately)
   - or pick a date/time and click **Schedule** (background thread handles it)
4. Watch Chrome do the work. Each job retries up to 3 times; failures stay red on the calendar with the Selenium error stored in the backend.

## Manual trigger
You can manually flush pending jobs (opens Chrome):
```bash
cd backend
venv\Scripts\activate
python manual_upload.py
```

## API quick reference
- `POST /videos/upload`
- `GET /videos`
- `POST /schedules`
- `GET /schedules`
- `DELETE /schedules/{id}`
- `POST /schedules/{id}/upload-now`

Swagger docs live at http://localhost:8000/docs.

## Notes
- This repo ignores the `tiktok-uploader/` folder; clone upstream yourself.
- `backend/uploads/` is gitignored; videos don’t persist once uploaded.
- TikTok UI breaks? Update `tiktok-uploader` (or tweak selectors there).

## Credits
- [tiktok-uploader](https://github.com/wkaisertexas/tiktok-uploader) for the Selenium machinery
- Built with FastAPI, React, Tailwind, and a lot of trial/error

