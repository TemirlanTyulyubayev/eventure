from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """JWT токен ответ"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Данные внутри токена"""
    user_id: int


class LoginRequest(BaseModel):
    """Схема для логина"""
    email: EmailStr
    password: str
