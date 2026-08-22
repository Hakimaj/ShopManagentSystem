from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_staff_or_admin, require_admin
from app.schemas.expense import (
    ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCategoryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseSummary
)
from app.services.expense_service import ExpenseService
from app.models.user import User
from app.core.exceptions import EntityNotFoundException, DuplicateEntityException

router = APIRouter(prefix="/expenses", tags=["Expenses"])


# ── Expense Categories ─────────────────────────────────────────────────────

@router.get("/categories", response_model=list[ExpenseCategoryResponse])
def list_expense_categories(db: Session = Depends(get_db),
                             current_user: User = Depends(require_staff_or_admin)):
    return [ExpenseCategoryResponse.model_validate(c)
            for c in ExpenseService(db).list_categories()]


@router.post("/categories", response_model=ExpenseCategoryResponse,
             status_code=status.HTTP_201_CREATED)
def create_expense_category(data: ExpenseCategoryCreate,
                             db: Session = Depends(get_db),
                             current_user: User = Depends(require_admin)):
    try:
        return ExpenseCategoryResponse.model_validate(
            ExpenseService(db).create_category(data))
    except DuplicateEntityException as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.put("/categories/{cat_id}", response_model=ExpenseCategoryResponse)
def update_expense_category(cat_id: int, data: ExpenseCategoryUpdate,
                             db: Session = Depends(get_db),
                             current_user: User = Depends(require_admin)):
    try:
        return ExpenseCategoryResponse.model_validate(
            ExpenseService(db).update_category(cat_id, data))
    except EntityNotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)
    except DuplicateEntityException as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.delete("/categories/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense_category(cat_id: int,
                             db: Session = Depends(get_db),
                             current_user: User = Depends(require_admin)):
    try:
        ExpenseService(db).delete_category(cat_id)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)


# ── Expenses ───────────────────────────────────────────────────────────────

@router.get("", response_model=dict)
def list_expenses(
    period: str = Query("all"),
    custom_date: str | None = None,
    category_id: int | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    svc = ExpenseService(db)
    items, total, pages = svc.list_expenses(
        period=period, custom_date=custom_date,
        category_id=category_id, page=page, size=size
    )
    return {
        "items": [ExpenseResponse.model_validate(e).model_dump() for e in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/summary", response_model=ExpenseSummary)
def get_expense_summary(
    period: str = Query("all"),
    custom_date: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    svc = ExpenseService(db)
    total = svc.get_total_for_period(period=period, custom_date=custom_date)
    return ExpenseSummary(total_expenses=total, period=period)


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(require_admin)):
    try:
        return ExpenseResponse.model_validate(ExpenseService(db).create_expense(data))
    except EntityNotFoundException as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.put("/{exp_id}", response_model=ExpenseResponse)
def update_expense(exp_id: int, data: ExpenseUpdate,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(require_admin)):
    try:
        return ExpenseResponse.model_validate(
            ExpenseService(db).update_expense(exp_id, data))
    except EntityNotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.delete("/{exp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(exp_id: int,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(require_admin)):
    try:
        ExpenseService(db).delete_expense(exp_id)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=404, detail=e.message)
