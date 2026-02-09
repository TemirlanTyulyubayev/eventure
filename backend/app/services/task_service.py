from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List

from app.crud.task import crud_task
from app.crud.event import crud_event
from app.schemas.task import TaskCreate, TaskUpdate
from app.models.task import Task


class TaskService:
    """Task business logic"""
    
    def create_task(self, db: Session, task_data: TaskCreate, user_id: int) -> Task:
        """Create a new task"""
        # Verify event exists and user is organizer
        event = crud_event.get(db, id=task_data.event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        if event.organizer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event organizer can create tasks"
            )
        
        task = crud_task.create(db, obj_in=task_data)
        return task
    
    def get_task(self, db: Session, task_id: int) -> Task:
        """Get task by ID"""
        task = crud_task.get(db, id=task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        return task
    
    def get_event_tasks(self, db: Session, event_id: int) -> List[Task]:
        """Get all tasks for an event"""
        return crud_task.get_by_event(db, event_id=event_id)
    
    def get_user_tasks(self, db: Session, user_id: int) -> List[Task]:
        """Get all tasks assigned to a user"""
        return crud_task.get_by_user(db, user_id=user_id)
    
    def update_task(self, db: Session, task_id: int, task_data: TaskUpdate, user_id: int) -> Task:
        """Update a task"""
        task = self.get_task(db, task_id)
        event = crud_event.get(db, id=task.event_id)
        
        # Check if user is organizer or assigned to task
        if event.organizer_id != user_id and task.assigned_to_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organizer or assignee can update task"
            )
        
        task = crud_task.update(db, db_obj=task, obj_in=task_data)
        return task
    
    def delete_task(self, db: Session, task_id: int, user_id: int) -> None:
        """Delete a task"""
        task = self.get_task(db, task_id)
        event = crud_event.get(db, id=task.event_id)
        
        # Check if user is organizer
        if event.organizer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event organizer can delete tasks"
            )
        
        crud_task.delete(db, id=task_id)


task_service = TaskService()
