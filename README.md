# 📱 TikTok Scheduler

Full-stack application to schedule and automate TikTok video uploads.

## Features

- 🎥 **Video Upload**: Drag & drop interface for uploading videos
- 📅 **Calendar Scheduling**: Visual calendar to schedule uploads
- 🤖 **AI Descriptions**: Auto-generate TikTok captions
- ⏰ **Automated Posting**: Celery task queue for scheduled uploads
- 🎨 **Modern UI**: React + Tailwind CSS

## Tech Stack

### Backend
- **FastAPI** - REST API
- **SQLAlchemy** - ORM
- **Celery** - Task queue
- **Redis** - Message broker
- **Selenium** - TikTok automation

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Big Calendar** - Calendar UI
- **TanStack Query** - Data fetching
- **React Dropzone** - File uploads

## Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (recommended)
- Chrome browser (for TikTok automation)
- TikTok cookies file

### Quick Start with Docker

1. **Clone and setup:**
```bash
cd TiktokScheduler
```

2. **Add your TikTok cookies:**
```bash
# Get cookies from your browser using the extension:
# https://github.com/kairi003/Get-cookies.txt-LOCALLY
# Save as tiktok-uploader/tiktok_only_cookies.txt
```

3. **Start everything:**
```bash
docker-compose up -d
```

4. **Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Redis (in another terminal)
redis-server

# Start API server
uvicorn main:app --reload

# Start Celery worker (in another terminal)
celery -A tasks worker --loglevel=info --beat
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Usage

### 1. Upload Videos

- Drag & drop video files into the "Video Library" panel
- AI will auto-generate descriptions
- Edit descriptions as needed

### 2. Schedule Posts

- Click a video's calendar icon
- OR click a date on the calendar
- Set date, time (UTC), and description
- Click "Schedule"

### 3. Monitor

- Calendar shows scheduled posts color-coded by status:
  - 🟢 Green = Pending
  - 🔵 Blue = Uploading
  - ⚪ Gray = Completed
  - 🔴 Red = Failed

## API Endpoints

### Videos
- `POST /videos/upload` - Upload video
- `GET /videos` - List all videos
- `GET /videos/{id}` - Get video details
- `DELETE /videos/{id}` - Delete video

### Schedules
- `POST /schedules` - Create schedule
- `GET /schedules` - List schedules
- `PATCH /schedules/{id}` - Update schedule
- `DELETE /schedules/{id}` - Cancel schedule

Full API docs: http://localhost:8000/docs

## Configuration

### Environment Variables

Create `.env` in backend/:

```bash
# Optional
OPENAI_API_KEY=sk-...  # For AI descriptions
```

### TikTok Cookies

The app needs your TikTok session cookies to upload:

1. Install the "Get cookies.txt" browser extension
2. Go to tiktok.com while logged in
3. Export cookies
4. Save only TikTok cookies to `tiktok-uploader/tiktok_only_cookies.txt`

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│   FastAPI   │────▶│   Celery    │
│  Frontend   │     │   Backend   │     │   Worker    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   SQLite    │     │    Redis    │
                    │  Database   │     │   Queue     │
                    └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   TikTok    │
                                        │  Uploader   │
                                        └─────────────┘
```

## Troubleshooting

### Videos not uploading?
- Check cookies are fresh (regenerate if needed)
- Ensure Chrome is installed in Docker container
- Check Celery worker logs: `docker-compose logs celery`

### Calendar not showing schedules?
- Check backend is running: http://localhost:8000
- Check browser console for errors
- Verify CORS settings in `main.py`

### "Unable to locate element" error?
- TikTok's UI changed - check for package updates
- Try non-headless mode to see what's happening
- File an issue on the tiktok-uploader repo

## Development

### Project Structure

```
TiktokScheduler/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── models.py         # Database models
│   ├── database.py       # DB connection
│   ├── tasks.py          # Celery tasks
│   ├── ai_description.py # AI caption gen
│   └── uploads/          # Video storage
├── frontend/
│   └── src/
│       ├── components/   # React components
│       ├── api/          # API client
│       └── App.jsx       # Main app
├── tiktok-uploader/      # TikTok automation
└── docker-compose.yml    # Docker setup
```

### Adding Features

1. Backend: Add endpoints in `main.py`
2. Frontend: Create components in `src/components/`
3. Database: Update models in `models.py`
4. Tasks: Add Celery tasks in `tasks.py`

## License

MIT

## Credits

- [tiktok-uploader](https://github.com/wkaisertexas/tiktok-uploader) by wkaisertexas
- Built with FastAPI, React, and Celery

