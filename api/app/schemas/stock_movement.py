from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.stock_movement import MovementType

class StockMovementBase(BaseModel):
    product_id: int = Field(..., gt=0, description="Product ID")
    type: MovementType = Field(..., description="Movement type (IN/OUT)")
    quantity: int = Field(..., gt=0, description="Quantity moved")
    reference_type: str | None = Field(None, description="Reference type (e.g., TRANSACTION, ADJUSTMENT)")
    reference_id: int | None = Field(None, description="Reference ID")
    notes: str | None = Field(None, description="Optional notes")

class StockMovementCreate(StockMovementBase):
    pass

class StockMovementResponse(StockMovementBase):
    id: int
    timestamp: datetime
    product_name: str | None = Field(None, description="Product name (joined from product table)")

    model_config = ConfigDict(from_attributes=True)

class StockMovementListResponse(BaseModel):
    items: list[StockMovementResponse]
    total: int = Field(..., ge=0, description="Total number of movements")