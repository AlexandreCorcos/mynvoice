from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "MYNVOICE"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://mynvoice:mynvoice@localhost:5432/mynvoice"

    # Auth
    SECRET_KEY: str = "change-me-in-production-use-a-real-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # Email (SMTP)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@mynvoice.app"

    # Where product suggestions from the in-app button are delivered. Falls
    # back to the sending address, which the operator already controls — so no
    # personal inbox has to be written into a public repository.
    FEEDBACK_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "MYNVOICE"

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    # Cloudflare R2
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET: str = "mynvoice"
    R2_PUBLIC_URL: Optional[str] = None  # e.g. https://cdn.mynvoice.com

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://app.mynvoice.com"]

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
