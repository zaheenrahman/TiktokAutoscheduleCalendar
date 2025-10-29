from celery import Celery
from datetime import datetime
import sys
import os
from pathlib import Path

# Add tiktok-uploader to path
TIKTOK_UPLOADER_PATH = Path(__file__).parent.parent / "tiktok-uploader" / "src"
sys.path.insert(0, str(TIKTOK_UPLOADER_PATH))

from tiktok_uploader.upload import upload_video
from database import SessionLocal
from models import ScheduledUpload

# Celery config
celery_app = Celery(
    "tiktok_scheduler",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="schedule_tiktok_upload")
def schedule_tiktok_upload(schedule_id: int):
    """Celery task to upload video to TikTok"""
    db = SessionLocal()
    
    try:
        # Get schedule
        schedule = db.query(ScheduledUpload).filter(ScheduledUpload.id == schedule_id).first()
        if not schedule:
            return {"error": "Schedule not found"}
        
        if schedule.status != "pending":
            return {"error": f"Schedule status is {schedule.status}, not pending"}
        
        # Update status
        schedule.status = "uploading"
        db.commit()
        
        # Get video
        video = schedule.video
        
        # Path to cookies
        cookies_path = Path(__file__).parent.parent / "tiktok-uploader" / "tiktok_only_cookies.txt"
        
        # Upload to TikTok
        result = upload_video(
            filename=video.file_path,
            description=schedule.description,
            cookies=str(cookies_path),
            headless=True,
        )
        
        if result:  # If result is not None/empty, it failed
            schedule.status = "failed"
            schedule.error_message = str(result)
        else:
            schedule.status = "completed"
            schedule.uploaded_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "schedule_id": schedule_id,
            "status": schedule.status,
            "uploaded_at": schedule.uploaded_at,
        }
        
    except Exception as e:
        schedule.status = "failed"
        schedule.error_message = str(e)
        db.commit()
        return {"error": str(e)}
    
    finally:
        db.close()

