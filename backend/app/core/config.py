from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

# Get absolute path to .env file
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # eventure/
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    PROJECT_NAME: str = "Eventure"
    DEBUG: bool = False
    
    DATABASE_URL: str
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:8000",
        "http://0.0.0.0:8000",
        "http://localhost:3000",
        "http://localhost:5173"
    ]
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),  # Absolute path to .env
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
