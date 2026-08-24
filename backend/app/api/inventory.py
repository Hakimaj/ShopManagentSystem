from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_staff_or_admin
from app.schemas.product import ProductGlobalStats
from app.services.product_service import ProductService
from app.models.user import User

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/stats", response_model=ProductGlobalStats)
def get_inventory_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """Get global inventory statistics (not limited by pagination)"""
    service = ProductService(db)
    stats = service.get_global_stats()
    return ProductGlobalStats.model_validate(stats)