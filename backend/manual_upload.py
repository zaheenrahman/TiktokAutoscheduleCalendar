"""Manual upload script - run this to upload pending schedules immediately"""
import sys
from pathlib import Path
from datetime import datetime

# Add tiktok-uploader to path
TIKTOK_UPLOADER_PATH = Path(__file__).parent.parent / "tiktok-uploader" / "src"
sys.path.insert(0, str(TIKTOK_UPLOADER_PATH))

from upload_worker import process_schedule
from database import SessionLocal
from models import ScheduledUpload


def upload_pending() -> None:
    """Upload all pending schedules immediately using the shared worker."""
    db = SessionLocal()
    try:
        schedules = (
            db.query(ScheduledUpload)
            .filter(ScheduledUpload.status == "pending")
            .all()
        )

        if not schedules:
            print("No pending uploads")
            return

        print(f"Found {len(schedules)} pending upload(s)")

        for schedule in schedules:
            print(f"\n📤 Uploading: {schedule.video.original_filename}")
            print(f"   Description: {schedule.description}")
            success = process_schedule(schedule.id, headless=False)
            if success:
                print("✅ Success!")
            else:
                print("❌ Failed — check schedule status for details")

        print("\n✅ All done!")
    finally:
        db.close()


if __name__ == "__main__":
    upload_pending()

