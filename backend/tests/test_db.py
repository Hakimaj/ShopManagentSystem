from sqlalchemy import text
from app.db.session import engine

def test_db_connection():
    """Verify that the engine can establish connection and query basic information."""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            assert result.scalar() == 1
    except Exception as e:
        assert False, f"Database connectivity check failed: {e}"
