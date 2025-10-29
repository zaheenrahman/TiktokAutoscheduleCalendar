"""Simple background scheduler - checks every minute for pending uploads"""
import time
from datetime import datetime
import threading

from database import SessionLocal
from models import ScheduledUpload
from upload_worker import process_schedule

def check_and_upload():
    """Check for uploads that are due and process them"""
    db = SessionLocal()
    
    try:
        # Use local time (no timezone)
        now = datetime.now()

        # Get pending schedules that are due
        due_schedules = (
            db.query(ScheduledUpload)
            .filter(
                ScheduledUpload.status == "pending",
                ScheduledUpload.scheduled_time <= now,
            )
            .all()
        )

        if not due_schedules:
            return

        print(f"[{now.strftime('%H:%M:%S')}] Found {len(due_schedules)} upload(s) to process")

        for schedule in due_schedules:
            print(f"  📤 Uploading: {schedule.video.original_filename}")
            process_schedule(schedule.id, headless=False)
        
    except Exception as e:
        print(f"Error in scheduler: {e}")
    finally:
        db.close()


def run_scheduler():
    """Run the scheduler loop"""
    print("🕐 Scheduler started - checking every 60 seconds")
    
    while True:
        try:
            check_and_upload()
        except Exception as e:
            print(f"Scheduler error: {e}")
        
        time.sleep(60)  # Check every minute


def start_scheduler_thread():
    """Start the scheduler in a background thread"""
    thread = threading.Thread(target=run_scheduler, daemon=True)
    thread.start()
    return thread


if __name__ == "__main__":
    # Run standalone
    run_scheduler()

