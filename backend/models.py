from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False, unique=True)
    file_path = Column(String, nullable=False)
    description = Column(Text)
    thumbnail_path = Column(String, nullable=True)
    file_size = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    schedules = relationship("ScheduledUpload", back_populates="video", cascade="all, delete-orphan")


class ScheduledUpload(Base):
    __tablename__ = "scheduled_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, uploading, completed, failed, cancelled
    uploaded_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    video = relationship("Video", back_populates="schedules")

