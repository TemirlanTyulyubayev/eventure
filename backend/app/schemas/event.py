from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional

from app.models.event import EventStatus


class EventBase(BaseModel):
    """Base event schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=300)
    start_time: datetime
    end_time: datetime
    status: EventStatus = EventStatus.PLANNING

    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, v: datetime, info) -> datetime:
        """Validate that end_time is after start_time"""
        if 'start_time' in info.data and v <= info.data['start_time']:
            raise ValueError('End time must be after start time')
        return v


class EventCreate(EventBase):
    """Schema for creating event"""
    pass


class EventUpdate(BaseModel):
    """Schema for updating event"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=300)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[EventStatus] = None


class EventResponse(EventBase):
    """Schema for event response"""
    id: int
    organizer_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
