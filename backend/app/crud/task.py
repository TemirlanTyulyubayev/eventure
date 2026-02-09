from sqlalchemy.orm import Session
from typing import List

from app.crud.base import CRUDBase
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


class CRUDTask(CRUDBase[Task, TaskCreate, TaskUpdate]):
    """CRUD operations for Task"""
    
    def get_by_event(self, db: Session, event_id: int) -> List[Task]:
        """Get all tasks for an event"""
        return db.query(Task).filter(Task.event_id == event_id).all()
    
    def get_by_user(self, db: Session, user_id: int) -> List[Task]:
        """Get all tasks assigned to a user"""
        return db.query(Task).filter(Task.assigned_to_id == user_id).all()


crud_task = CRUDTask(Task)
