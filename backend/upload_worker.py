"""Shared upload worker logic"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from time import sleep

from database import SessionLocal
from models import ScheduledUpload

# Add tiktok-uploader to path
import sys

TIKTOK_UPLOADER_PATH = Path(__file__).parent.parent / "tiktok-uploader" / "src"
sys.path.insert(0, str(TIKTOK_UPLOADER_PATH))

from tiktok_uploader.upload import upload_video


def process_schedule(
    schedule_id: int,
    *,
    headless: bool = False,
    max_attempts: int = 3,
    retry_delay_seconds: int = 15,
) -> bool:
    """Process a scheduled upload with retries.

    Returns True on success, False on failure or if schedule not found.
    """

    db = SessionLocal()
    try:
        schedule = (
            db.query(ScheduledUpload)
            .filter(ScheduledUpload.id == schedule_id)
            .first()
        )

        if not schedule:
            print(f"[upload-worker] Schedule {schedule_id} not found")
            return False

        if schedule.status in {"completed", "cancelled"}:
            print(
                f"[upload-worker] Schedule {schedule_id} already {schedule.status}, skipping"
            )
            return False

        video = schedule.video
        if not video:
            schedule.status = "failed"
            schedule.error_message = "Video record missing"
            db.commit()
            return False

        cookies_path = (
            Path(__file__).parent.parent
            / "tiktok-uploader"
            / "tiktok_only_cookies.txt"
        )

        schedule.status = "uploading"
        db.commit()

        for attempt in range(1, max_attempts + 1):
            print(
                f"[upload-worker] Schedule {schedule_id}: attempt {attempt}/{max_attempts}"
            )
            try:
                result = upload_video(
                    filename=video.file_path,
                    description=schedule.description,
                    cookies=str(cookies_path),
                    headless=headless,
                )

                if not result:
                    schedule.status = "completed"
                    schedule.uploaded_at = datetime.now()
                    schedule.error_message = None
                    db.commit()
                    print(f"[upload-worker] Schedule {schedule_id}: success")
                    return True

                message = (
                    f"Attempt {attempt} failed: {result}"
                    if not isinstance(result, str)
                    else f"Attempt {attempt} failed: {result}"
                )
                schedule.error_message = message
                db.commit()
                print(f"[upload-worker] {message}")

            except Exception as exc:  # noqa: BLE001
                message = f"Attempt {attempt} raised error: {exc}"
                schedule.error_message = message
                db.commit()
                print(f"[upload-worker] {message}")

            if attempt < max_attempts:
                print(
                    f"[upload-worker] Schedule {schedule_id}: retrying in {retry_delay_seconds}s"
                )
                sleep(retry_delay_seconds)

        schedule.status = "failed"
        db.commit()
        print(f"[upload-worker] Schedule {schedule_id}: all attempts failed")
        return False

    finally:
        db.close()

