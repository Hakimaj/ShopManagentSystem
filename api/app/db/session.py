import os
import logging
import tempfile
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

def resolve_ca_path() -> Path | None:
    """
    Resolves the CA certificate path for Aiven MySQL TLS validation.
    Checks:
    1. DATABASE_SSL_CA / DB_SSL_CA environment variables
    2. File paths relative to backend directory or project root
    3. DB_SSL_CA_CONTENT / AIVEN_CA_CERT certificate text written to a temp file
    """
    # 1. Direct environment variable path
    env_ca = os.getenv("DB_SSL_CA") or os.getenv("DATABASE_SSL_CA") or settings.DATABASE_SSL_CA
    if env_ca and Path(env_ca).is_file():
        return Path(env_ca).resolve()

    # 2. Filesystem candidates relative to this module and CWD
    current_dir = Path(__file__).resolve().parent # app/db
    backend_dir = current_dir.parent.parent # backend
    root_dir = backend_dir.parent # project root

    candidates = [
        backend_dir / "ca.pem",
        root_dir / "ca.pem",
        root_dir / "backend" / "ca.pem",
        current_dir / "ca.pem",
        Path.cwd() / "backend" / "ca.pem",
        Path.cwd() / "ca.pem",
    ]

    for candidate in candidates:
        try:
            if candidate.is_file() and candidate.stat().st_size > 0:
                return candidate.resolve()
        except Exception:
            continue

    # 3. Inline certificate content from environment variable
    ca_content = os.getenv("DB_SSL_CA_CONTENT") or os.getenv("AIVEN_CA_CERT")
    if ca_content and "-----BEGIN CERTIFICATE-----" in ca_content:
        try:
            tmp_path = Path(tempfile.gettempdir()) / "aiven_ca.pem"
            tmp_path.write_text(ca_content.strip(), encoding="utf-8")
            return tmp_path.resolve()
        except Exception as e:
            logger.warning(f"Could not write temp CA certificate: {e}")

    return None

def is_ssl_required() -> bool:
    """
    Determines if TLS/SSL verification is needed for this database connection.
    Enabled for cloud databases (e.g. Aiven) or when explicitly configured via env.
    """
    if os.getenv("DB_SSL_CA") or os.getenv("DATABASE_SSL_CA") or settings.DATABASE_SSL_CA:
        return True
    if os.getenv("DB_SSL_CA_CONTENT") or os.getenv("AIVEN_CA_CERT"):
        return True
    if "aivencloud.com" in settings.sqlalchemy_database_uri:
        return True
    if settings.host not in ("localhost", "127.0.0.1", ""):
        return True
    return False

def ensure_database_exists() -> None:
    """
    For local development, ensures the target database exists.
    For managed cloud databases (like Aiven), skips gracefully.
    """
    if settings.USE_SQLITE or settings.sqlalchemy_database_uri.startswith("sqlite"):
        return

    # If running against cloud/Aiven MySQL or using a direct DATABASE_URL, skip root database creation
    if settings.DATABASE_URL or "aivencloud.com" in settings.host:
        return

    try:
        root_server_url = (
            f"mysql+pymysql://{settings.user}:{settings.password}"
            f"@{settings.host}:{settings.port}/"
        )
        temp_engine = create_engine(root_server_url, isolation_level="AUTOCOMMIT")
        with temp_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{settings.db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
            logger.info(f"Database `{settings.db_name}` checked/created successfully.")
        temp_engine.dispose()
    except Exception as err:
        logger.debug(f"Database pre-creation check skipped: {err}")

# Auto-create database if running locally against MySQL
ensure_database_exists()

# Configure engine arguments
connect_args = {}
if settings.sqlalchemy_database_uri.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    connect_args["charset"] = "utf8mb4"
    if is_ssl_required():
        ca_path = resolve_ca_path()
        if ca_path:
            connect_args["ssl"] = {"ca": str(ca_path)}
            logger.info(f"TLS SSL enabled using CA certificate at: {ca_path}")
        else:
            logger.info("SSL enabled for cloud database using system default verification.")

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
