from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_staff_or_admin
from app.schemas.transaction import (
    CheckoutRequest,
    TransactionResponse,
    TransactionListResponse
)
from app.services.transaction_service import TransactionService
from app.models.user import User
from app.core.exceptions import EntityNotFoundException, BusinessValidationException

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    checkout_in: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    service = TransactionService(db)
    try:
        txn = service.process_checkout(checkout_in, user_id=current_user.id)
        return TransactionResponse.model_validate(txn)
    except (EntityNotFoundException, BusinessValidationException) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

@router.get("", response_model=TransactionListResponse)
def list_transactions(
    period: str = "all",
    custom_date: str | None = None,
    payment_method: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    service = TransactionService(db)
    items, total, pages = service.list_transactions(
        period=period,
        custom_date=custom_date,
        payment_method=payment_method,
        page=page,
        size=size
    )
    return TransactionListResponse(
        items=[TransactionResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/{txn_id}", response_model=TransactionResponse)
def get_transaction(
    txn_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    service = TransactionService(db)
    try:
        txn = service.get_transaction(txn_id)
        return TransactionResponse.model_validate(txn)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
