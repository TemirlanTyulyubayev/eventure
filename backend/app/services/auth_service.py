from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.crud.user import crud_user
from app.schemas.user import UserCreate
from app.schemas.token import Token
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User


class AuthService:
    """Authentication business logic"""
    
    def register_user(self, db: Session, user_data: UserCreate) -> User:
        """Register a new user"""
        # Check if user already exists
        existing_user = crud_user.get_by_email(db, email=user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        user = crud_user.create(db, obj_in=user_data)
        return user
    
    def login_user(self, db: Session, email: str, password: str) -> Token:
        """Authenticate user and return tokens"""
        # Authenticate user
        user = crud_user.authenticate(db, email=email, password=password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
        
        # Create tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )


# Singleton instance
auth_service = AuthService()
