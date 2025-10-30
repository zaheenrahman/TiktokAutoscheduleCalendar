from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
import shutil
import os
from pathlib import Path
import uuid

from database import SessionLocal, init_db
from models import Video, ScheduledUpload, Profile
from ai_description import generate_description
from scheduler import start_scheduler_thread
from upload_worker import process_schedule

app = FastAPI(title="TikTok Scheduler API")

# Start background scheduler
@app.on_event("startup")
def startup_event():
    start_scheduler_thread()
    print("✅ Background scheduler started")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
COOKIES_DIR = Path("cookies")
COOKIES_DIR.mkdir(exist_ok=True)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize database
init_db()


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic models
class VideoCreate(BaseModel):
    filename: str
    description: Optional[str] = None


class ProfileCreate(BaseModel):
    name: str
    cookies_filename: str
    proxy: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    cookies_filename: Optional[str] = None
    proxy: Optional[str] = None
    is_active: Optional[bool] = None


class ScheduleCreate(BaseModel):
    video_id: int
    profile_id: int
    scheduled_time: datetime
    description: str


class ScheduleUpdate(BaseModel):
    scheduled_time: Optional[datetime] = None
    description: Optional[str] = None


@app.get("/")
def root():
    return {"message": "TikTok Scheduler API"}


# ===== PROFILES ENDPOINTS =====

@app.get("/profiles")
def get_profiles(db: Session = Depends(get_db)):
    """Get all profiles"""
    profiles = db.query(Profile).all()
    return profiles


@app.post("/profiles")
def create_profile(profile: ProfileCreate, db: Session = Depends(get_db)):
    """Create a new profile"""
    # Check if cookies file exists
    cookies_path = COOKIES_DIR / profile.cookies_filename
    if not cookies_path.exists():
        raise HTTPException(status_code=400, detail=f"Cookies file {profile.cookies_filename} not found in backend/cookies/ directory")
    
    # Check if profile name already exists
    existing = db.query(Profile).filter(Profile.name == profile.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile name already exists")
    
    new_profile = Profile(
        name=profile.name,
        cookies_filename=profile.cookies_filename,
        proxy=profile.proxy,
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile


@app.patch("/profiles/{profile_id}")
def update_profile(profile_id: int, profile_update: ProfileUpdate, db: Session = Depends(get_db)):
    """Update a profile"""
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if profile_update.name is not None:
        profile.name = profile_update.name
    if profile_update.cookies_filename is not None:
        cookies_path = COOKIES_DIR / profile_update.cookies_filename
        if not cookies_path.exists():
            raise HTTPException(status_code=400, detail=f"Cookies file {profile_update.cookies_filename} not found")
        profile.cookies_filename = profile_update.cookies_filename
    if profile_update.proxy is not None:
        profile.proxy = profile_update.proxy
    if profile_update.is_active is not None:
        profile.is_active = profile_update.is_active
    
    db.commit()
    db.refresh(profile)
    return profile


@app.delete("/profiles/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    """Delete a profile"""
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Check if profile has schedules
    if profile.schedules:
        raise HTTPException(status_code=400, detail="Cannot delete profile with existing schedules. Delete schedules first.")
    
    db.delete(profile)
    db.commit()
    return {"message": "Profile deleted"}


# ===== VIDEOS ENDPOINTS =====

@app.post("/videos/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file"""
    if not file.filename.endswith(('.mp4', '.mov', '.avi', '.mkv')):
        raise HTTPException(status_code=400, detail="Invalid video format")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    new_filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / new_filename
    
    # Save file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Generate AI description
    try:
        ai_description = generate_description(file.filename, str(file_path))
    except Exception as e:
        ai_description = f"Video: {file.filename}"
    
    # Save to database
    db = SessionLocal()
    try:
        video = Video(
            original_filename=file.filename,
            stored_filename=new_filename,
            file_path=str(file_path),
            description=ai_description,
            thumbnail_path=None,
            file_size=os.path.getsize(file_path),
        )
        db.add(video)
        db.commit()
        db.refresh(video)
        return {
            "id": video.id,
            "filename": video.original_filename,
            "stored_filename": video.stored_filename,
            "description": video.description,
            "file_size": video.file_size,
        }
    finally:
        db.close()


@app.get("/videos")
def get_videos(db: Session = Depends(get_db)):
    """Get all videos"""
    videos = db.query(Video).all()
    return [
        {
            "id": v.id,
            "filename": v.original_filename,
            "stored_filename": v.stored_filename,
            "description": v.description,
            "file_size": v.file_size,
            "created_at": v.created_at,
            "is_scheduled": len(v.schedules) > 0,
        }
        for v in videos
    ]


@app.delete("/videos/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    """Delete a video"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Delete file
    if os.path.exists(video.file_path):
        os.remove(video.file_path)
    
    db.delete(video)
    db.commit()
    return {"message": "Video deleted"}


# ===== SCHEDULES ENDPOINTS =====

@app.post("/schedules")
def create_schedule(schedule: ScheduleCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Create a new scheduled upload"""
    # Verify video exists
    video = db.query(Video).filter(Video.id == schedule.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Verify profile exists
    profile = db.query(Profile).filter(Profile.id == schedule.profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if not profile.is_active:
        raise HTTPException(status_code=400, detail="Profile is not active")
    
    # Create schedule
    new_schedule = ScheduledUpload(
        video_id=schedule.video_id,
        profile_id=schedule.profile_id,
        scheduled_time=schedule.scheduled_time,
        description=schedule.description,
        status="pending",
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    
    # If scheduled within 2 minutes, trigger immediately in background
    now = datetime.now()
    time_diff = (new_schedule.scheduled_time - now).total_seconds()
    
    if time_diff <= 120:
        background_tasks.add_task(process_schedule, new_schedule.id)
        print(f"⚡ Immediate upload triggered for schedule {new_schedule.id}")
    
    return {
        "id": new_schedule.id,
        "video_id": new_schedule.video_id,
        "profile_id": new_schedule.profile_id,
        "scheduled_time": new_schedule.scheduled_time,
        "description": new_schedule.description,
        "status": new_schedule.status,
    }


@app.get("/schedules")
def get_schedules(db: Session = Depends(get_db)):
    """Get all scheduled uploads"""
    schedules = db.query(ScheduledUpload).all()
    return [
        {
            "id": s.id,
            "video_id": s.video_id,
            "video_filename": s.video.original_filename,
            "video_file_url": f"/uploads/{s.video.filename}" if s.video else None,
            "profile_id": s.profile_id,
            "profile_name": s.profile.name if s.profile else None,
            "scheduled_time": s.scheduled_time,
            "description": s.description,
            "status": s.status,
            "uploaded_at": s.uploaded_at,
            "error_message": s.error_message,
        }
        for s in schedules
    ]


@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Delete a scheduled upload"""
    schedule = db.query(ScheduledUpload).filter(ScheduledUpload.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule deleted"}


@app.post("/schedules/{schedule_id}/upload-now")
def upload_now(schedule_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Manually trigger upload for a pending schedule"""
    schedule = db.query(ScheduledUpload).filter(ScheduledUpload.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if schedule.status != "pending":
        raise HTTPException(status_code=400, detail=f"Schedule is not pending (current status: {schedule.status})")
    
    background_tasks.add_task(process_schedule, schedule_id)
    return {"message": "Upload triggered"}
