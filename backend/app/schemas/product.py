from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.category import CategoryResponse

class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50, description="Unique stock SKU / code")
    name: str = Field(..., min_length=1, max_length=150, description="Product item name")
    category_id: int = Field(..., gt=0, description="Associated Category ID")
    cost_price: Decimal = Field(..., ge=0, description="Cost price per unit (fixed-point)")
    selling_price: Decimal = Field(..., ge=0, description="Selling price per unit (fixed-point)")
    current_stock: int = Field(0, ge=0, description="On-hand inventory level")
    description: str | None = Field(None, description="Detailed product description")
    image_url: str | None = Field(None, description="Public image URL or asset reference")
    is_active: bool = Field(True, description="Active status flag")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: str | None = Field(None, min_length=1, max_length=50)
    name: str | None = Field(None, min_length=1, max_length=150)
    category_id: int | None = Field(None, gt=0)
    cost_price: Decimal | None = Field(None, ge=0)
    selling_price: Decimal | None = Field(None, ge=0)
    current_stock: int | None = Field(None, ge=0)
    description: str | None = None
    image_url: str | None = None
    is_active: bool | None = None

class ProductResponse(ProductBase):
    id: int
    category: CategoryResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginationMeta(BaseModel):
    total: int = Field(..., ge=0, description="Total number of items")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, description="Items per page")
    pages: int = Field(..., ge=0, description="Total available pages")

class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    meta: PaginationMeta
