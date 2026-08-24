from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_staff_or_admin
from app.schemas.stock_movement import StockMovementListResponse, StockMovementResponse
from app.services.stock_movement_service import StockMovementService
from app.models.stock_movement import MovementType
from app.models.user import User

router = APIRouter(prefix="/stock-movements", tags=["Stock Movements"])

@router.get("", response_model=StockMovementListResponse)
def list_stock_movements(
    type: MovementType | None = Query(None, description="Filter by movement type (IN/OUT)"),
    period: str = Query("all", description="Time period filter: all, today, month, half_year, year"),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """List stock movements with filtering and pagination"""
    service = StockMovementService(db)
    movements, total = service.list_movements(
        movement_type=type,
        period=period,
        page=page,
        size=size
    )
    
    return StockMovementListResponse(
        items=[StockMovementResponse.model_validate(m) for m in movements],
        total=total
    )