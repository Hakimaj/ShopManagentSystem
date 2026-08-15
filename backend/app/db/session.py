import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure engine arguments
connect_args = {}
if settings.sqlalchemy_database_uri.startswith("sqlite"):
    # SQLite connection configuration for thread safety
    connect_args["check_same_thread"] = False
else:
    # MySQL specific connection optimization properties
    connect_args["charset"] = "utf8mb4"

try:
    engine = create_engine(
        settings.sqlalchemy_database_uri,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args=connect_args
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    logger.error(f"Failed to initialize database engine: {e}")
    raise e
