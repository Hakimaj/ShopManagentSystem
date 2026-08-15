from decimal import Decimal
import pytest
from app.services.category_service import CategoryService
from app.services.product_service import ProductService
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.product import ProductCreate, ProductUpdate
from app.core.exceptions import EntityNotFoundException, DuplicateEntityException, BusinessValidationException

def test_category_service(db_session):
    service = CategoryService(db_session)

    # 1. Create Category
    cat = service.create_category(CategoryCreate(name="Window Care"))
    assert cat.id is not None
    assert cat.name == "Window Care"

    # 2. Reject Duplicate Name
    with pytest.raises(DuplicateEntityException):
        service.create_category(CategoryCreate(name="Window Care"))

    # 3. Update Category
    updated = service.update_category(cat.id, CategoryUpdate(name="Glass & Window Care"))
    assert updated.name == "Glass & Window Care"

    # 4. Entity Not Found
    with pytest.raises(EntityNotFoundException):
        service.get_category_by_id(99999)

def test_product_service(db_session):
    cat_service = CategoryService(db_session)
    prod_service = ProductService(db_session)

    cat = cat_service.create_category(CategoryCreate(name="Kitchen Care"))

    # 1. Create Product
    prod_in = ProductCreate(
        sku="KTN-SPRAY-1",
        name="Kitchen Degreaser Spray",
        category_id=cat.id,
        cost_price=Decimal("180.00"),
        selling_price=Decimal("300.00"),
        current_stock=20
    )
    prod = prod_service.create_product(prod_in)
    assert prod.id is not None
    assert prod.sku == "KTN-SPRAY-1"

    # 2. Reject Duplicate SKU
    with pytest.raises(DuplicateEntityException):
        prod_service.create_product(prod_in)

    # 3. Reject Non-Existent Category
    bad_prod_in = ProductCreate(
        sku="KTN-SPRAY-2",
        name="Spray 2",
        category_id=99999,
        cost_price=Decimal("100.00"),
        selling_price=Decimal("150.00")
    )
    with pytest.raises(EntityNotFoundException):
        prod_service.create_product(bad_prod_in)

    # 4. Stock Adjustment
    updated_prod = prod_service.adjust_stock(prod.id, 50)
    assert updated_prod.current_stock == 50

    # 5. Reject Negative Stock
    with pytest.raises(BusinessValidationException):
        prod_service.adjust_stock(prod.id, -10)

    # 6. Deactivate Product
    deactivated = prod_service.deactivate_product(prod.id)
    assert deactivated.is_active is False
