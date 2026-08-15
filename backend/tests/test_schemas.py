from decimal import Decimal
import pytest
from pydantic import ValidationError
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

def test_category_schema_validation():
    # Valid
    cat = CategoryCreate(name="Personal Care")
    assert cat.name == "Personal Care"

    # Empty name should fail
    with pytest.raises(ValidationError):
        CategoryCreate(name="")

def test_product_schema_validation():
    # Valid product
    prod_data = {
        "sku": "CLN-DET-1L",
        "name": "Detergent 1L",
        "category_id": 1,
        "cost_price": Decimal("150.50"),
        "selling_price": Decimal("250.00"),
        "current_stock": 20,
        "description": "Laundry wash",
        "image_url": "https://example.com/image.webp"
    }
    prod = ProductCreate(**prod_data)
    assert prod.sku == "CLN-DET-1L"
    assert prod.cost_price == Decimal("150.50")
    assert prod.selling_price == Decimal("250.00")

    # Negative price should fail
    with pytest.raises(ValidationError):
        ProductCreate(
            sku="BAD-SKU",
            name="Bad Item",
            category_id=1,
            cost_price=Decimal("-10.00"),
            selling_price=Decimal("20.00")
        )

    # Negative stock should fail
    with pytest.raises(ValidationError):
        ProductCreate(
            sku="BAD-SKU-2",
            name="Bad Item 2",
            category_id=1,
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00"),
            current_stock=-5
        )

    # Empty SKU or Name should fail
    with pytest.raises(ValidationError):
        ProductCreate(
            sku="",
            name="Valid Name",
            category_id=1,
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )

def test_product_partial_update_schema():
    # Partial updates allow updating only some fields
    update_data = ProductUpdate(selling_price=Decimal("280.00"), current_stock=15)
    assert update_data.selling_price == Decimal("280.00")
    assert update_data.current_stock == 15
    assert update_data.name is None
