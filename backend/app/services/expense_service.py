from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from app.repositories.expense_repository import ExpenseCategoryRepository, ExpenseRepository
from app.schemas.expense import (
    ExpenseCategoryCreate, ExpenseCategoryUpdate,
    ExpenseCreate, ExpenseUpdate
)
from app.models.expense import ExpenseCategory, Expense
from app.core.exceptions import EntityNotFoundException, DuplicateEntityException, BusinessValidationException


class ExpenseService:
    def __init__(self, db: Session):
        self.db = db
        self.cat_repo = ExpenseCategoryRepository(db)
        self.exp_repo = ExpenseRepository(db)

    # ── Categories ────────────────────────────────────────────────────────

    def list_categories(self) -> list[ExpenseCategory]:
        return self.cat_repo.list_all()

    def get_category(self, cat_id: int) -> ExpenseCategory:
        obj = self.cat_repo.get_by_id(cat_id)
        if not obj:
            raise EntityNotFoundException(f"Expense category {cat_id} not found.")
        return obj

    def create_category(self, data: ExpenseCategoryCreate) -> ExpenseCategory:
        if self.cat_repo.get_by_name(data.name):
            raise DuplicateEntityException(f"Expense category '{data.name}' already exists.")
        return self.cat_repo.create({"name": data.name.strip()})

    def update_category(self, cat_id: int, data: ExpenseCategoryUpdate) -> ExpenseCategory:
        obj = self.get_category(cat_id)
        existing = self.cat_repo.get_by_name(data.name)
        if existing and existing.id != cat_id:
            raise DuplicateEntityException(f"Expense category '{data.name}' already exists.")
        return self.cat_repo.update(obj, {"name": data.name.strip()})

    def delete_category(self, cat_id: int) -> None:
        obj = self.get_category(cat_id)
        self.cat_repo.delete(obj)

    # ── Expenses ──────────────────────────────────────────────────────────

    def list_expenses(
        self,
        period: str = "all",
        custom_date: str | None = None,
        category_id: int | None = None,
        page: int = 1,
        size: int = 50,
    ) -> tuple[list[Expense], int, int]:
        start, end = self._date_range(period, custom_date)
        skip = (page - 1) * size
        items, total = self.exp_repo.list_expenses(
            start_date=start, end_date=end,
            category_id=category_id, skip=skip, limit=size
        )
        pages = (total + size - 1) // size if total > 0 else 0
        return items, total, pages

    def get_expense(self, exp_id: int) -> Expense:
        obj = self.exp_repo.get_by_id(exp_id)
        if not obj:
            raise EntityNotFoundException(f"Expense {exp_id} not found.")
        return obj

    def create_expense(self, data: ExpenseCreate) -> Expense:
        self.get_category(data.category_id)  # validate FK
        return self.exp_repo.create({
            "category_id": data.category_id,
            "amount": data.amount,
            "expense_date": data.expense_date,
            "description": data.description,
        })

    def update_expense(self, exp_id: int, data: ExpenseUpdate) -> Expense:
        obj = self.get_expense(exp_id)
        if data.category_id:
            self.get_category(data.category_id)
        update_dict = data.model_dump(exclude_unset=True)
        return self.exp_repo.update(obj, update_dict)

    def delete_expense(self, exp_id: int) -> None:
        obj = self.get_expense(exp_id)
        self.exp_repo.delete(obj)

    def get_total_for_period(self, period: str, custom_date: str | None = None) -> Decimal:
        start, end = self._date_range(period, custom_date)
        return self.exp_repo.get_total(start_date=start, end_date=end)

    # ── Helpers ───────────────────────────────────────────────────────────

    def _date_range(self, period: str, custom_date: str | None) -> tuple[date | None, date | None]:
        today = datetime.now(timezone.utc).date()
        if period == "daily":
            return today, today
        if period == "monthly":
            return today.replace(day=1), None
        if period == "half_year":
            return (today - timedelta(days=180)), None
        if period == "yearly":
            return (today - timedelta(days=365)), None
        if period == "custom" and custom_date:
            try:
                d = date.fromisoformat(custom_date)
                return d, d
            except ValueError:
                pass
        return None, None
