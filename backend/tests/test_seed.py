from sqlalchemy import select, func
from app.models.category import Category
from app.models.product import Product
from app.db.seed import seed_database
from app.db.seed_data import SEED_CATEGORIES, SEED_PRODUCTS

def test_seed_database_idempotent(db_session):
    """Verify that seed_database populates categories and products and does not duplicate on repeat execution."""
    # First seed run
    seed_database(db_session)

    cat_count_1 = db_session.execute(select(func.count(Category.id))).scalar()
    prod_count_1 = db_session.execute(select(func.count(Product.id))).scalar()

    assert cat_count_1 == len(SEED_CATEGORIES)
    assert prod_count_1 == len(SEED_PRODUCTS)

    # Verify a specific product and its category relationship
    stmt = select(Product).where(Product.sku == "CLN-LIQ-DET-2L")
    prod = db_session.execute(stmt).scalar_one()
    assert prod.name == "Liquid Detergent 2L"
    assert prod.category.name == "Laundry & Cleaning"
    assert prod.current_stock == 45

    # Second seed run (Idempotency check)
    seed_database(db_session)

    cat_count_2 = db_session.execute(select(func.count(Category.id))).scalar()
    prod_count_2 = db_session.execute(select(func.count(Product.id))).scalar()

    assert cat_count_2 == cat_count_1
    assert prod_count_2 == prod_count_1
