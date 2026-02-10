from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List

from app.crud.event import crud_event
from app.schemas.event import EventCreate, EventUpdate
from app.models.event import Event


class EventService:
    """Event business logic"""
    
    def create_event(self, db: Session, event_data: EventCreate, organizer_id: int) -> Event:
        """Create a new event"""
        # Validate dates
        if event_data.end_time <= event_data.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time"
            )
        
        # Create event with organizer
        event_dict = event_data.model_dump()
        event_dict["organizer_id"] = organizer_id
        event = crud_event.create(db, obj_in=event_dict)
        return event
    
    def get_event(self, db: Session, event_id: int) -> Event:
        """Get event by ID"""
        event = crud_event.get(db, id=event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        return event
    
    def get_all_events(self, db: Session, skip: int = 0, limit: int = 100) -> List[Event]:
        """Get all events"""
        return crud_event.get_multi(db, skip=skip, limit=limit)
    
    def update_event(self, db: Session, event_id: int, event_data: EventUpdate, user_id: int) -> Event:
        """Update an event"""
        event = self.get_event(db, event_id)
        
        # Check if user is organizer
        if event.organizer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organizer can update event"
            )
        
        # Validate dates if provided
        if event_data.start_time and event_data.end_time:
            if event_data.end_time <= event_data.start_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End time must be after start time"
                )
        
        event = crud_event.update(db, db_obj=event, obj_in=event_data)
        return event
    
    def delete_event(self, db: Session, event_id: int, user_id: int) -> None:
        """Delete an event"""
        event = self.get_event(db, event_id)
        
        # Check if user is organizer
        if event.organizer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organizer can delete event"
            )
        
        # Delete the event - cascade will delete related tasks
        db.delete(event)
        db.commit()


event_service = EventService()
