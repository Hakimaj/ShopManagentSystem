from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class CheckoutItemRequest(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    sold_price: Decimal = Field(..., ge=0)

class CheckoutRequest(BaseModel):
    payment_method: str = Field(..., pattern="^(Cash|Telebirr|Bank)$")
    items: list[CheckoutItemRequest] = Field(..., min_length=1)

class StockAdjustmentRequest(BaseModel):
    new_stock: int = Field(..., ge=0)

class TransactionItemResponse(BaseModel):
    id: int
    product_id: int | None = None
    product_name: str
    quantity: int
    cost_price: Decimal
    selling_price: Decimal

    model_config = ConfigDict(from_attributes=True)

class TransactionResponse(BaseModel):
    id: str
    timestamp: datetime
    payment_method: str
    total_revenue: Decimal
    total_profit: Decimal
    items: list[TransactionItemResponse]

    model_config = ConfigDict(from_attributes=True)

class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    size: int
    pages: int

class DashboardKPI(BaseModel):
    filtered_revenue: Decimal
    filtered_profit: Decimal
    orders_count: int
    items_sold: int

class DashboardSummaryResponse(BaseModel):
    kpi: DashboardKPI
    period: str
