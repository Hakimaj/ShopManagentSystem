import logging
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_staff_or_admin
from app.schemas.transaction import DashboardSummaryResponse, DashboardKPI
from app.services.transaction_service import TransactionService
from app.models.user import User

logger = logging.getLogger("dashboard")
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    period: str = Query("all", description="Period filter: daily, monthly, half_year, all, custom"),
    custom_date: str | None = Query(None, description="Custom date (YYYY-MM-DD) if period is custom"),
    payment_method: str | None = Query(None, description="Filter by payment method (Cash, Telebirr, Bank, All)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    try:
        service = TransactionService(db)
        result = service.get_dashboard_summary(
            period=period,
            custom_date=custom_date,
            payment_method=payment_method
        )
        return DashboardSummaryResponse.model_validate(result)
    except Exception as exc:
        # Log full traceback so it appears in server logs, then return a safe
        # zero-value KPI rather than a raw 500 that breaks the whole dashboard.
        logger.error(
            f"Dashboard summary failed (period={period}, custom_date={custom_date}): {exc}",
            exc_info=True
        )
        # Return a zeroed-out summary so the frontend still renders cleanly
        return DashboardSummaryResponse(
            kpi=DashboardKPI(
                filtered_revenue=Decimal("0.00"),
                filtered_profit=Decimal("0.00"),
                orders_count=0,
                items_sold=0,
                total_expenses=Decimal("0.00"),
                net_profit=Decimal("0.00"),
            ),
            period=period
        )
