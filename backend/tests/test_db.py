from sqlalchemy import text
from app.db.session import engine

def test_db_connection(db_session):
    """Verify database session connectivity and basic queries."""
    try:
        result = db_session.execute(text("SELECT 1"))
        assert result.scalar() == 1
    except Exception as e:
        assert False, f"Database connectivity check failed: {e}"
