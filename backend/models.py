from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    cookies_filename = Column(String, nullable=False)  # e.g., "account1.txt"
    proxy = Column(String, nullable=True)  # e.g., "http://user:pass@host:port"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    schedules = relationship("ScheduledUpload", back_populates="profile", cascade="all, delete-orphan")


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
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, uploading, completed, failed, cancelled
    uploaded_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    video = relationship("Video", back_populates="schedules")
    profile = relationship("Profile", back_populates="schedules")

