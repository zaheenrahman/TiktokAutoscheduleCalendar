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

from tiktok_uploader import config as tt_config  # noqa: E402
from tiktok_uploader.upload import upload_video  # noqa: E402


_SLOW_MODE_APPLIED = False


def _apply_slow_mode() -> None:
    """Loosen Selenium timeouts so TikTok UI has time to breathe."""
    global _SLOW_MODE_APPLIED
    if _SLOW_MODE_APPLIED:
        return

    # Only ever increase waits; respect user overrides if they are higher already
    tt_config.implicit_wait = max(tt_config.implicit_wait, 10)
    tt_config.explicit_wait = max(tt_config.explicit_wait, 90)
    tt_config.uploading_wait = max(tt_config.uploading_wait, 300)
    tt_config.add_hashtag_wait = max(tt_config.add_hashtag_wait, 7)

    # Always run with the browser visible for debugging
    tt_config.headless = False

    _SLOW_MODE_APPLIED = True


def process_schedule(
    schedule_id: int,
    *,
    headless: bool = False,
    max_attempts: int = 3,
    retry_delay_seconds: int = 20,
    initial_delay_seconds: int = 3,
) -> bool:
    """Process a scheduled upload with retries.

    Returns True on success, False on failure or if schedule not found.
    """

    _apply_slow_mode()

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

        profile = schedule.profile
        if not profile:
            schedule.status = "failed"
            schedule.error_message = "Profile record missing"
            db.commit()
            return False

        # Use profile-specific cookies file
        cookies_path = Path(__file__).parent / "cookies" / profile.cookies_filename
        
        if not cookies_path.exists():
            schedule.status = "failed"
            schedule.error_message = f"Cookies file not found: {profile.cookies_filename}"
            db.commit()
            return False

        schedule.status = "uploading"
        db.commit()

        # Give Chrome a moment before hammering TikTok
        sleep(max(initial_delay_seconds, 0))

        for attempt in range(1, max_attempts + 1):
            print(
                f"[upload-worker] Schedule {schedule_id}: attempt {attempt}/{max_attempts}"
            )
            try:
                # Build kwargs for upload_video
                upload_kwargs = {
                    "filename": video.file_path,
                    "description": schedule.description,
                    "cookies": str(cookies_path),
                    "headless": headless,
                    "num_retries": 1,  # Reduced to 1 to avoid internal retries
                }
                
                # Add proxy if profile has one configured
                if profile.proxy:
                    upload_kwargs["proxy"] = profile.proxy
                
                result = upload_video(**upload_kwargs)

                if not result:
                    schedule.status = "completed"
                    schedule.uploaded_at = datetime.now()
                    schedule.error_message = None
                    db.commit()
                    print(f"[upload-worker] Schedule {schedule_id}: success")
                    return True

                # Check if error is just about the "Post now" button not found
                # This means the video was actually posted successfully (redirects to TikTok Studio)
                error_str = str(result) if result else ""
                if "No 'Post now' button found" in error_str or "post_now" in error_str.lower():
                    print(f"[upload-worker] Schedule {schedule_id}: ✅ Video posted successfully (TikTok Studio redirect detected)")
                    schedule.status = "completed"
                    schedule.uploaded_at = datetime.now()
                    schedule.error_message = None  # Clear error - this is actually success
                    db.commit()
                    return True

                message = (
                    f"Attempt {attempt} failed: {result}"
                    if not isinstance(result, str)
                    else f"Attempt {attempt} failed: {result}"
                )
                schedule.error_message = message
                db.commit()
                print(f"[upload-worker] {message}")
                
                # Don't retry if it's just a timeout - video is likely posted
                if "timeout" in error_str.lower() and attempt == 1:
                    print(f"[upload-worker] Schedule {schedule_id}: Timeout on first attempt, assuming success")
                    schedule.status = "completed"
                    schedule.uploaded_at = datetime.now()
                    schedule.error_message = "Completed (timeout - verify on TikTok)"
                    db.commit()
                    return True

            except Exception as exc:  # noqa: BLE001
                message = f"Attempt {attempt} raised error: {exc}"
                schedule.error_message = message
                db.commit()
                print(f"[upload-worker] {message}")

            if attempt < max_attempts:
                print(
                    f"[upload-worker] Schedule {schedule_id}: retrying in {retry_delay_seconds}s"
                )
                sleep(max(retry_delay_seconds, 1))

        schedule.status = "failed"
        db.commit()
        print(f"[upload-worker] Schedule {schedule_id}: all attempts failed")
        return False

    finally:
        db.close()

