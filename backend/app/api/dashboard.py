from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_staff_or_admin
from app.schemas.transaction import DashboardSummaryResponse
from app.services.transaction_service import TransactionService
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    period: str = Query("all", description="Period filter: daily, monthly, half_year, all, custom"),
    custom_date: str | None = Query(None, description="Custom date (YYYY-MM-DD) if period is custom"),
    payment_method: str | None = Query(None, description="Filter by payment method (Cash, Telebirr, Bank, All)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    service = TransactionService(db)
    result = service.get_dashboard_summary(
        period=period,
        custom_date=custom_date,
        payment_method=payment_method
    )
    return DashboardSummaryResponse.model_validate(result)
