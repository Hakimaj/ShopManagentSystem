import logging
from sqlalchemy import select
from app.db.session import engine, SessionLocal
from app.db.base_class import Base
# Import all models to ensure they are registered with Base.metadata
import app.models  # noqa: F401
from app.models.user import User, UserRole
from app.core.security import get_password_hash

logger = logging.getLogger("init_db")

def init_db() -> None:
    """
    1. Generates any missing tables using SQLAlchemy metadata (safe — ignores existing tables/data).
    2. Seeds default admin/staff accounts ONLY if they do not already exist.
       Existing users and their passwords are NEVER modified.
    """
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")

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
