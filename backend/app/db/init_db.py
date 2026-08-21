import logging
from sqlalchemy import select
from app.db.session import engine, SessionLocal
from app.db.base_class import Base
# Import all models to ensure they are registered with Base.metadata
import app.models  # noqa: F401
from app.models.user import User, UserRole
from app.core.security import get_password_hash

logger = logging.getLogger("init_db")

def _run_alembic_upgrade() -> None:
    """Run any pending Alembic migrations programmatically (upgrade to head)."""
    try:
        from alembic.config import Config
        from alembic import command
        import os

        alembic_ini = os.path.join(
            os.path.dirname(__file__), '..', '..', 'alembic.ini'
        )
        alembic_ini = os.path.abspath(alembic_ini)
        if not os.path.exists(alembic_ini):
            logger.warning(f"alembic.ini not found at {alembic_ini}, skipping Alembic upgrade.")
            return

        alembic_cfg = Config(alembic_ini)
        scripts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'alembic')
        alembic_cfg.set_main_option('script_location', os.path.abspath(scripts_dir))
        command.upgrade(alembic_cfg, 'head')
        logger.info("Alembic upgrade to head completed.")
    except Exception as e:
        logger.warning(f"Alembic upgrade skipped or failed (non-fatal): {e}")


def init_db() -> None:
    """
    1. Generates any missing tables using SQLAlchemy metadata (safe — ignores existing tables/data).
    2. Applies any pending Alembic migrations (additive only).
    3. Seeds default admin/staff accounts ONLY if they do not already exist.
       Existing users and their passwords are NEVER modified.
    """
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")

        # Apply any outstanding additive migrations (e.g. new indexes)
        _run_alembic_upgrade()

        db = SessionLocal()
        try:
            default_accounts = [
                {
                    "username": "admin",
                    "email": "admin@cleancare.local",
                    "full_name": "System Administrator",
                    "role": UserRole.ADMIN.value,
                    "password": "password"
                },
                {
                    "username": "staff",
                    "email": "staff@cleancare.local",
                    "full_name": "Cashier Staff",
                    "role": UserRole.STAFF.value,
                    "password": "password"
                }
            ]

            for acc in default_accounts:
                stmt = select(User).where(User.username == acc["username"])
                existing_user = db.execute(stmt).scalar_one_or_none()

                if not existing_user:
                    # Only create the user if they do not yet exist
                    new_user = User(
                        username=acc["username"],
                        email=acc["email"],
                        full_name=acc["full_name"],
                        role=acc["role"],
                        hashed_password=get_password_hash(acc["password"]),
                        is_active=True
                    )
                    db.add(new_user)
                    logger.info(f"Created default user '{acc['username']}'.")
                else:
                    # User already exists — do NOT touch their password or any other field
                    logger.info(f"User '{acc['username']}' already exists — skipping (data preserved).")

            db.commit()
            logger.info("Startup user check complete.")
        except Exception as seed_err:
            db.rollback()
            logger.warning(f"Error during startup user check: {seed_err}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")
