import json
from typing import Any, List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CleanCare POS API"
    APP_NAME: str = "CleanCare POS"
    APP_ENV: str = "dev"
    API_STR: str = "/api"
    
    # Auth Security
    SECRET_KEY: str = "cleancare-pos-insecure-dev-secret-key-change-in-prod-983427189"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Uploads
    UPLOAD_DIR: str = "uploads"

    # CORS origins
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return v
        raise ValueError(v)

    # Database
    DATABASE_URL: str = ""
    DATABASE_SERVER: str = "localhost"
    DATABASE_USER: str = "root"
    DATABASE_PASSWORD: str = ""
    DATABASE_DB: str = "cleancare_db"
    DATABASE_PORT: int = 3306
    USE_SQLITE: bool = True

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.USE_SQLITE:
            return "sqlite:///./cleancare.db"
        return f"mysql+pymysql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_SERVER}:{self.DATABASE_PORT}/{self.DATABASE_DB}"

    def model_post_init(self, __context: Any) -> None:
        if self.APP_ENV != "dev" and "insecure-dev-secret-key" in self.SECRET_KEY:
            import warnings
            warnings.warn(
                "CRITICAL SECURITY WARNING: Insecure default SECRET_KEY is being used in a non-dev environment! "
                "Set a secure SECRET_KEY in your .env file before deploying.",
                RuntimeWarning
            )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
