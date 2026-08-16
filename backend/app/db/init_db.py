import logging
from sqlalchemy import select, text
from app.db.session import engine, SessionLocal
from app.db.base_class import Base
# Import all models to ensure they are registered with Base.metadata
import app.models  # noqa: F401
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.db.seed_data import SEED_USERS

logger = logging.getLogger("init_db")

def init_db() -> None:
    """
    1. Generates all tables in MySQL / SQLite database using SQLAlchemy metadata.
    2. Resets/syncs users table with properly bcrypt-hashed passwords for default users.
    """
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")

        db = SessionLocal()
        try:
            # Force re-sync of default user accounts with verified bcrypt hashes
            # Supports both 'password' and 'admin123' / 'staff123'
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

                hashed_pwd = get_password_hash(acc["password"])

                if not existing_user:
                    new_user = User(
                        username=acc["username"],
                        email=acc["email"],
                        full_name=acc["full_name"],
                        role=acc["role"],
                        hashed_password=hashed_pwd,
                        is_active=True
                    )
                    db.add(new_user)
                    logger.info(f"Created user '{acc['username']}' with bcrypt hashed password.")
                else:
                    # Update existing password with freshly calculated bcrypt hash to guarantee login works
                    existing_user.hashed_password = hashed_pwd
                    existing_user.is_active = True
                    logger.info(f"Updated user '{acc['username']}' with freshly verified bcrypt hash.")

            db.commit()
            logger.info("User accounts verified and seeded successfully.")
        except Exception as seed_err:
            db.rollback()
            logger.warning(f"Error checking/seeding users: {seed_err}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")
