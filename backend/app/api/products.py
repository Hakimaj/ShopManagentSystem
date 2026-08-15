from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_staff_or_admin, require_admin
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    PaginationMeta
)
from app.schemas.transaction import StockAdjustmentRequest
from app.services.product_service import ProductService
from app.models.user import User
from app.core.exceptions import EntityNotFoundException, DuplicateEntityException, BusinessValidationException

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=ProductListResponse)
def list_products(
    search: str | None = None,
    category_id: int | None = None,
    is_active: bool | None = True,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    service = ProductService(db)
    items, total, pages = service.list_products(
        search=search,
        category_id=category_id,
        is_active=is_active,
        page=page,
        size=size
    )
    return ProductListResponse(
        items=[ProductResponse.model_validate(p) for p in items],
        meta=PaginationMeta(total=total, page=page, size=size, pages=pages)
    )

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    service = ProductService(db)
    try:
        product = service.get_product_by_id(product_id)
        return ProductResponse.model_validate(product)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    service = ProductService(db)
    try:
        product = service.create_product(product_in)
        return ProductResponse.model_validate(product)
    except DuplicateEntityException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    service = ProductService(db)
    try:
        product = service.update_product(product_id, product_in)
        return ProductResponse.model_validate(product)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except DuplicateEntityException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)

@router.patch("/{product_id}/stock", response_model=ProductResponse)
def adjust_product_stock(
    product_id: int,
    stock_in: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    service = ProductService(db)
    try:
        product = service.adjust_stock(product_id, stock_in.new_stock)
        return ProductResponse.model_validate(product)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except BusinessValidationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

@router.delete("/{product_id}", response_model=ProductResponse)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    service = ProductService(db)
    try:
        product = service.deactivate_product(product_id)
        return ProductResponse.model_validate(product)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
