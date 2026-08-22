from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class ExpenseCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ExpenseCategoryUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ExpenseCategoryResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(BaseModel):
    category_id: int = Field(..., gt=0)
    amount: Decimal = Field(..., gt=0)
    expense_date: date
    description: str | None = Field(None, max_length=500)


class ExpenseUpdate(BaseModel):
    category_id: int | None = Field(None, gt=0)
    amount: Decimal | None = Field(None, gt=0)
    expense_date: date | None = None
    description: str | None = Field(None, max_length=500)


class ExpenseResponse(BaseModel):
    id: int
    category_id: int
    category: ExpenseCategoryResponse | None = None
    amount: Decimal
    expense_date: date
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExpenseSummary(BaseModel):
    total_expenses: Decimal
    period: str
