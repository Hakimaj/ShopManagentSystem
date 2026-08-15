from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError
from app.models.category import Category
from app.models.product import Product

def test_create_category_and_product(client, db_session):
    """Verify that a category and product can be created and bound via relationship."""
    # Create category
    cat = Category(name="Laundry Care")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    assert cat.id is not None
    assert cat.name == "Laundry Care"

    # Create product
    prod = Product(
        sku="TEST-SKU-1",
        name="Test Liquid Soap",
        category_id=cat.id,
        cost_price=Decimal("120.50"),
        selling_price=Decimal("200.00"),
        current_stock=10,
        description="A test soap item",
        is_active=True
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    assert prod.id is not None
    assert prod.category.name == "Laundry Care"
    assert cat.products[0].sku == "TEST-SKU-1"

def test_unique_constraints(client, db_session):
    """Verify unique constraint rules on SKU and Category name."""
    cat1 = Category(name="Unique Care")
    db_session.add(cat1)
    db_session.commit()

    # Attempt to insert duplicate category name
    cat2 = Category(name="Unique Care")
    db_session.add(cat2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Create distinct category for product tests
    cat3 = Category(name="Clean Tools")
    db_session.add(cat3)
    db_session.commit()

    # Create product
    prod1 = Product(
        sku="DUP-SKU",
        name="Tool A",
        category_id=cat3.id,
        cost_price=Decimal("10.00"),
        selling_price=Decimal("15.00"),
        current_stock=5
    )
    db_session.add(prod1)
    db_session.commit()

    # Attempt duplicate SKU
    prod2 = Product(
        sku="DUP-SKU",
        name="Tool B",
        category_id=cat3.id,
        cost_price=Decimal("20.00"),
        selling_price=Decimal("30.00"),
        current_stock=2
    )
    db_session.add(prod2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
