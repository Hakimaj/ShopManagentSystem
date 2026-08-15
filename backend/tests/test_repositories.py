from decimal import Decimal
from app.repositories.category_repository import CategoryRepository
from app.repositories.product_repository import ProductRepository

def test_category_repository(db_session):
    cat_repo = CategoryRepository(db_session)

    # Create
    cat = cat_repo.create("Oral Care")
    assert cat.id is not None
    assert cat.name == "Oral Care"

    # Get by ID and Name
    assert cat_repo.get_by_id(cat.id).name == "Oral Care"
    assert cat_repo.get_by_name("Oral Care").id == cat.id

    # Update
    updated = cat_repo.update(cat, "Dental & Oral Care")
    assert updated.name == "Dental & Oral Care"

    # List all
    all_cats = cat_repo.list_all()
    assert any(c.name == "Dental & Oral Care" for c in all_cats)

def test_product_repository(db_session):
    cat_repo = CategoryRepository(db_session)
    prod_repo = ProductRepository(db_session)

    cat = cat_repo.create("Floor Care")

    # Create product
    prod_data = {
        "sku": "FLR-MOP-1",
        "name": "Microfiber Mop",
        "category_id": cat.id,
        "cost_price": Decimal("250.00"),
        "selling_price": Decimal("400.00"),
        "current_stock": 12,
        "description": "Floor cleaning mop",
        "image_url": "https://example.com/mop.jpg",
        "is_active": True
    }
    prod = prod_repo.create(prod_data)
    assert prod.id is not None
    assert prod.sku == "FLR-MOP-1"

    # Get by SKU
    fetched = prod_repo.get_by_sku("FLR-MOP-1")
    assert fetched is not None
    assert fetched.id == prod.id

    # Search & Filter
    items, total = prod_repo.list_products(search="Microfiber", category_id=cat.id)
    assert total >= 1
    assert any(p.sku == "FLR-MOP-1" for p in items)

    # Stock Update
    updated_prod = prod_repo.update_stock(prod, 25)
    assert updated_prod.current_stock == 25

    # Soft Delete
    deactivated = prod_repo.soft_delete(prod)
    assert deactivated.is_active is False
