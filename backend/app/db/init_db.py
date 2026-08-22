import logging
from sqlalchemy import select, text
from app.db.session import engine, SessionLocal
from app.db.base_class import Base
# Import all models to ensure they are registered with Base.metadata
import app.models  # noqa: F401
from app.models.user import User, UserRole
from app.core.security import get_password_hash

logger = logging.getLogger("init_db")


def _is_sqlite() -> bool:
    return str(engine.url).startswith("sqlite")


def _column_exists(conn, table: str, column: str) -> bool:
    """Check whether a column already exists in a table (MySQL + SQLite compatible)."""
    try:
        if _is_sqlite():
            result = conn.execute(text(f"PRAGMA table_info({table})"))
            return any(row[1] == column for row in result.fetchall())
        else:
            # MySQL / MariaDB
            result = conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() "
                f"AND TABLE_NAME = '{table}' AND COLUMN_NAME = '{column}'"
            ))
            return result.scalar_one() > 0
    except Exception:
        return False


def _table_exists(conn, table: str) -> bool:
    """Check whether a table exists (MySQL + SQLite compatible)."""
    try:
        if _is_sqlite():
            result = conn.execute(text(
                f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'"
            ))
            return result.scalar_one_or_none() is not None
        else:
            result = conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA = DATABASE() "
                f"AND TABLE_NAME = '{table}'"
            ))
            return result.scalar_one() > 0
    except Exception:
        return False


def _apply_additive_schema_changes() -> None:
    """
    Idempotent additive schema migrations executed via raw SQL.

    Why raw SQL instead of Alembic?
    --------------------------------
    On Vercel (production), the `api/` folder has no Alembic setup.
    `Base.metadata.create_all()` skips columns/tables that already exist.
    Raw SQL with IF NOT EXISTS / column-presence checks is the only reliable
    way to apply additive changes to a live production DB every startup
    without risking data loss.

    CRITICAL: Nothing here drops, truncates, or modifies existing columns/rows.
    """
    try:
        with engine.begin() as conn:

            # ── 1. transactions.status column ──────────────────────────────
            if not _column_exists(conn, "transactions", "status"):
                logger.info("Adding 'status' column to transactions table…")
                if _is_sqlite():
                    conn.execute(text(
                        "ALTER TABLE transactions ADD COLUMN status VARCHAR(20) "
                        "NOT NULL DEFAULT 'COMPLETED'"
                    ))
                else:
                    conn.execute(text(
                        "ALTER TABLE transactions ADD COLUMN status VARCHAR(20) "
                        "NOT NULL DEFAULT 'COMPLETED'"
                    ))
                    # Index for fast status-based queries
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS ix_transactions_status "
                        "ON transactions (status)"
                    ))
                logger.info("'status' column added to transactions.")

            # ── 2. expense_categories table ────────────────────────────────
            if not _table_exists(conn, "expense_categories"):
                logger.info("Creating expense_categories table…")
                if _is_sqlite():
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS expense_categories (
                            id         INTEGER PRIMARY KEY AUTOINCREMENT,
                            name       VARCHAR(100) NOT NULL UNIQUE,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
                        )
                    """))
                else:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS expense_categories (
                            id         INT AUTO_INCREMENT PRIMARY KEY,
                            name       VARCHAR(100) NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                            UNIQUE KEY uq_expense_categories_name (name)
                        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
                    """))
                logger.info("expense_categories table created.")

            # ── 3. expenses table ──────────────────────────────────────────
            if not _table_exists(conn, "expenses"):
                logger.info("Creating expenses table…")
                if _is_sqlite():
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS expenses (
                            id           INTEGER PRIMARY KEY AUTOINCREMENT,
                            category_id  INTEGER NOT NULL
                                         REFERENCES expense_categories(id)
                                         ON DELETE RESTRICT,
                            amount       DECIMAL(10,2) NOT NULL,
                            expense_date DATE NOT NULL,
                            description  TEXT,
                            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                            updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
                        )
                    """))
                else:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS expenses (
                            id           INT AUTO_INCREMENT PRIMARY KEY,
                            category_id  INT NOT NULL,
                            amount       DECIMAL(10,2) NOT NULL,
                            expense_date DATE NOT NULL,
                            description  TEXT,
                            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                            updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
                                         ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                            INDEX ix_expenses_category_id  (category_id),
                            INDEX ix_expenses_expense_date (expense_date),
                            CONSTRAINT fk_expenses_category
                                FOREIGN KEY (category_id)
                                REFERENCES expense_categories(id)
                                ON DELETE RESTRICT
                        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
                    """))
                logger.info("expenses table created.")

        logger.info("Additive schema changes applied successfully.")

    except Exception as exc:
        logger.error(f"Additive schema migration failed: {exc}", exc_info=True)
        # Non-fatal — the app will still start; the affected features may show
        # errors until the schema is manually corrected.


def init_db() -> None:
    """
    Startup sequence:
      1. Create any completely new tables (safe — skips existing ones).
      2. Apply additive column/table changes that create_all() would skip.
      3. Seed default admin/staff accounts ONLY if they do not exist.
         Existing users and their passwords are NEVER modified.
    """
    try:
        logger.info("Initializing database tables via metadata.create_all…")
        Base.metadata.create_all(bind=engine)
        logger.info("metadata.create_all completed.")
    except Exception as e:
        logger.error(f"metadata.create_all failed: {e}")

    # Always run additive migrations — idempotent, safe on every restart
    _apply_additive_schema_changes()

    # Seed default accounts
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
                logger.info(f"User '{acc['username']}' already exists — skipping (data preserved).")

        db.commit()
        logger.info("Startup user check complete.")
    except Exception as seed_err:
        db.rollback()
        logger.warning(f"Error during startup user check: {seed_err}")
    finally:
        db.close()
