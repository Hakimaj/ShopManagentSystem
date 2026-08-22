from datetime import date
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from app.repositories.base import BaseRepository
from app.models.expense import Expense, ExpenseCategory


class ExpenseCategoryRepository(BaseRepository):
    def list_all(self) -> list[ExpenseCategory]:
        stmt = select(ExpenseCategory).order_by(ExpenseCategory.name.asc())
        return list(self.db.execute(stmt).scalars().all())

    def get_by_id(self, cat_id: int) -> ExpenseCategory | None:
        return self.db.execute(
            select(ExpenseCategory).where(ExpenseCategory.id == cat_id)
        ).scalar_one_or_none()

    def get_by_name(self, name: str) -> ExpenseCategory | None:
        return self.db.execute(
            select(ExpenseCategory).where(
                func.lower(ExpenseCategory.name) == name.lower().strip()
            )
        ).scalar_one_or_none()

    def create(self, data: dict) -> ExpenseCategory:
        obj = ExpenseCategory(**data)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ExpenseCategory, data: dict) -> ExpenseCategory:
        for k, v in data.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ExpenseCategory) -> None:
        self.db.delete(obj)
        self.db.commit()


class ExpenseRepository(BaseRepository):
    def list_expenses(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        category_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Expense], int]:
        query = select(Expense).options(joinedload(Expense.category))
        if start_date:
            query = query.where(Expense.expense_date >= start_date)
        if end_date:
            query = query.where(Expense.expense_date <= end_date)
        if category_id:
            query = query.where(Expense.category_id == category_id)

        count_q = select(func.count()).select_from(query.order_by(None).subquery())
        total = self.db.execute(count_q).scalar_one()

        items = list(
            self.db.execute(
                query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit)
            ).scalars().unique().all()
        )
        return items, total

    def get_by_id(self, expense_id: int) -> Expense | None:
        return self.db.execute(
            select(Expense).options(joinedload(Expense.category))
            .where(Expense.id == expense_id)
        ).scalar_one_or_none()

    def get_total(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> Decimal:
        query = select(func.coalesce(func.sum(Expense.amount), 0))
        if start_date:
            query = query.where(Expense.expense_date >= start_date)
        if end_date:
            query = query.where(Expense.expense_date <= end_date)
        result = self.db.execute(query).scalar_one()
        return Decimal(str(result))

    def create(self, data: dict) -> Expense:
        obj = Expense(**data)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: Expense, data: dict) -> Expense:
        for k, v in data.items():
            if hasattr(obj, k) and v is not None:
                setattr(obj, k, v)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: Expense) -> None:
        self.db.delete(obj)
        self.db.commit()
