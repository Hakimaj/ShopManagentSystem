import os
import json
from typing import Any, List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CleanCare POS API"
    APP_NAME: str = "CleanCare POS"
    APP_ENV: str = "production"
    API_STR: str = "/api"
    
    # Auth Security (Reads SECRET_KEY or JWT_SECRET)
    SECRET_KEY: str = "cleancare-pos-secret-change-in-production-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Uploads
    UPLOAD_DIR: str = "uploads"

    # CORS origins
    FRONTEND_URL: str = ""
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return v
        raise ValueError(v)

    # Database connection parameters (Supports both DATABASE_* and DB_* formats)
    DATABASE_URL: str = ""
    DATABASE_SERVER: str = ""
    DATABASE_USER: str = ""
    DATABASE_PASSWORD: str = ""
    DATABASE_DB: str = ""
    DATABASE_PORT: int = 3306
    DATABASE_SSL_CA: str = ""
    USE_SQLITE: bool = False

    @property
    def host(self) -> str:
        return self.DATABASE_SERVER or os.getenv("DB_HOST", "localhost")

    @property
    def user(self) -> str:
        return self.DATABASE_USER or os.getenv("DB_USER", "root")

    @property
    def password(self) -> str:
        return self.DATABASE_PASSWORD or os.getenv("DB_PASSWORD", "")

    @property
    def db_name(self) -> str:
        return self.DATABASE_DB or os.getenv("DB_NAME", "defaultdb")

    @property
    def port(self) -> int:
        p = self.DATABASE_PORT or os.getenv("DB_PORT")
        return int(p) if p else 3306

    @property
    def secret_key(self) -> str:
        return os.getenv("JWT_SECRET") or self.SECRET_KEY

    @property
    def sqlalchemy_database_uri(self) -> str:
        raw_url = self.DATABASE_URL or os.getenv("DB_URL", "")
        if raw_url:
            # Normalize mysql:// to mysql+pymysql://
            if raw_url.startswith("mysql://"):
                return raw_url.replace("mysql://", "mysql+pymysql://", 1)
            return raw_url
        if self.USE_SQLITE:
            return "sqlite:///./cleancare.db"
        return f"mysql+pymysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.db_name}"

    def model_post_init(self, __context: Any) -> None:
        if self.FRONTEND_URL and self.FRONTEND_URL not in self.BACKEND_CORS_ORIGINS:
            self.BACKEND_CORS_ORIGINS.append(self.FRONTEND_URL)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
