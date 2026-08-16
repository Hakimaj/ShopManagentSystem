from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.api.deps import get_db

router = APIRouter()

@router.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "CleanCare POS API"
    }

@router.get("/health/db", tags=["System"])
def db_health_check(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {type(e).__name__}"
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "CleanCare POS API",
        "database": db_status
    }
