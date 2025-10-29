from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import shutil
import os
from pathlib import Path
import uuid

from database import SessionLocal, init_db
from models import Video, ScheduledUpload
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

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize database
init_db()


# Pydantic models
class VideoCreate(BaseModel):
    filename: str
    description: Optional[str] = None


class ScheduleCreate(BaseModel):
    video_id: int
    scheduled_time: datetime
    description: str


class ScheduleUpdate(BaseModel):
    scheduled_time: Optional[datetime] = None
    description: Optional[str] = None


@app.get("/")
def root():
    return {"message": "TikTok Scheduler API"}


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
            thumbnail_path=None,  # TODO: Generate thumbnail
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
            "file_path": f"/uploads/{video.stored_filename}",
            "created_at": video.created_at,
        }
    finally:
        db.close()


@app.get("/videos")
def get_videos():
    """Get all videos"""
    db = SessionLocal()
    try:
        videos = db.query(Video).all()
        return [
            {
                "id": v.id,
                "filename": v.original_filename,
                "stored_filename": v.stored_filename,
                "description": v.description,
                "file_path": f"/uploads/{v.stored_filename}",
                "created_at": v.created_at,
                "is_scheduled": any(s.status == "pending" for s in v.schedules),
            }
            for v in videos
        ]
    finally:
        db.close()


@app.get("/videos/{video_id}")
def get_video(video_id: int):
    """Get single video"""
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        return {
            "id": video.id,
            "filename": video.original_filename,
            "description": video.description,
            "file_path": f"/uploads/{video.stored_filename}",
            "created_at": video.created_at,
        }
    finally:
        db.close()


@app.delete("/videos/{video_id}")
def delete_video(video_id: int):
    """Delete a video"""
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Delete file
        if os.path.exists(video.file_path):
            os.remove(video.file_path)
        
        # Delete from DB
        db.delete(video)
        db.commit()
        
        return {"message": "Video deleted"}
    finally:
        db.close()


def upload_video_task(schedule_id: int):
    """Background task wrapper"""
    process_schedule(schedule_id, headless=False)


@app.post("/schedules")
def create_schedule(schedule: ScheduleCreate, background_tasks: BackgroundTasks):
    """Schedule a video for upload"""
    db = SessionLocal()
    try:
        # Check video exists
        video = db.query(Video).filter(Video.id == schedule.video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Parse the datetime (no timezone conversion - user local time)
        if isinstance(schedule.scheduled_time, str):
            raw_time = schedule.scheduled_time.rstrip("Z")
            scheduled_time = datetime.fromisoformat(raw_time)
        else:
            scheduled_time = schedule.scheduled_time

        if scheduled_time.tzinfo:
            scheduled_time = scheduled_time.astimezone().replace(tzinfo=None)
        
        # Check if "post now" (scheduled within next 2 minutes)
        now = datetime.now()
        time_diff = (scheduled_time - now).total_seconds()
        
        # Create schedule
        new_schedule = ScheduledUpload(
            video_id=schedule.video_id,
            scheduled_time=scheduled_time,
            description=schedule.description,
            status="pending",
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)
        
        # If scheduled for very soon (< 2 min), upload immediately in background
        # Otherwise, the background scheduler will pick it up when time comes
        if time_diff < 120:
            background_tasks.add_task(upload_video_task, new_schedule.id)
        
        return {
            "id": new_schedule.id,
            "video_id": new_schedule.video_id,
            "scheduled_time": new_schedule.scheduled_time.isoformat(),
            "description": new_schedule.description,
            "status": new_schedule.status,
        }
    finally:
        db.close()


@app.get("/schedules")
def get_schedules():
    """Get all scheduled uploads"""
    db = SessionLocal()
    try:
        schedules = db.query(ScheduledUpload).all()
        return [
            {
                "id": s.id,
                "video_id": s.video_id,
                "video_filename": s.video.original_filename,
                "scheduled_time": s.scheduled_time,
                "description": s.description,
                "status": s.status,
                "uploaded_at": s.uploaded_at,
                "error_message": s.error_message,
            }
            for s in schedules
        ]
    finally:
        db.close()


@app.patch("/schedules/{schedule_id}")
def update_schedule(schedule_id: int, update: ScheduleUpdate):
    """Update a scheduled upload"""
    db = SessionLocal()
    try:
        schedule = db.query(ScheduledUpload).filter(ScheduledUpload.id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        if schedule.status != "pending":
            raise HTTPException(status_code=400, detail="Cannot update non-pending schedule")
        
        if update.scheduled_time:
            if update.scheduled_time <= datetime.utcnow():
                raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
            schedule.scheduled_time = update.scheduled_time
        
        if update.description:
            schedule.description = update.description
        
        db.commit()
        db.refresh(schedule)
        
        return {
            "id": schedule.id,
            "scheduled_time": schedule.scheduled_time,
            "description": schedule.description,
        }
    finally:
        db.close()


@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int):
    """Cancel a scheduled upload"""
    db = SessionLocal()
    try:
        schedule = db.query(ScheduledUpload).filter(ScheduledUpload.id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        if schedule.status == "pending":
            schedule.status = "cancelled"
            db.commit()
        
        return {"message": "Schedule cancelled"}
    finally:
        db.close()


@app.post("/schedules/{schedule_id}/upload-now")
def upload_now(schedule_id: int, background_tasks: BackgroundTasks):
    """Trigger immediate upload for a scheduled video"""
    db = SessionLocal()
    try:
        schedule = db.query(ScheduledUpload).filter(ScheduledUpload.id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        if schedule.status != "pending":
            raise HTTPException(status_code=400, detail="Can only upload pending schedules")
        
        # Trigger upload in background
        background_tasks.add_task(upload_video_task, schedule_id)
        
        return {"message": "Upload started"}
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

