import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.models.transaction import Transaction, TransactionItem
from app.core.security import get_password_hash
from app.db.seed_data import SEED_USERS, SEED_CATEGORIES, SEED_PRODUCTS, SEED_TRANSACTIONS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

def seed_database(db: Session) -> None:
    logger.info("Starting database seed operation...")

    # 1. Seed Users
    for user_data in SEED_USERS:
        stmt = select(User).where(User.username == user_data["username"])
        existing_user = db.execute(stmt).scalar_one_or_none()
        if not existing_user:
            new_user = User(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                hashed_password=get_password_hash(user_data["password"]),
                is_active=True
            )
            db.add(new_user)
            logger.info(f"Created user: {user_data['username']} ({user_data['role']})")
        else:
            logger.info(f"User already exists: {user_data['username']}")
    db.flush()

    # 2. Seed Categories
    category_map = {}
    for cat_data in SEED_CATEGORIES:
        stmt = select(Category).where(Category.name == cat_data["name"])
        existing_cat = db.execute(stmt).scalar_one_or_none()
        if not existing_cat:
            new_cat = Category(name=cat_data["name"])
            db.add(new_cat)
            db.flush()
            category_map[cat_data["name"]] = new_cat.id
            logger.info(f"Created category: {cat_data['name']}")
        else:
            category_map[cat_data["name"]] = existing_cat.id
            logger.info(f"Category already exists: {cat_data['name']}")

    # 3. Seed Products
    product_map = {}
    for prod_data in SEED_PRODUCTS:
        category_name = prod_data["category_name"]
        cat_id = category_map.get(category_name)
        if not cat_id:
            logger.warning(f"Category '{category_name}' not found for product {prod_data['sku']}, skipping.")
            continue

        stmt = select(Product).where(Product.sku == prod_data["sku"])
        existing_prod = db.execute(stmt).scalar_one_or_none()

        if not existing_prod:
            new_prod = Product(
                sku=prod_data["sku"],
                name=prod_data["name"],
                category_id=cat_id,
                cost_price=prod_data["cost_price"],
                selling_price=prod_data["selling_price"],
                current_stock=prod_data["current_stock"],
                description=prod_data["description"],
                image_url=prod_data["image_url"],
                is_active=True
            )
            db.add(new_prod)
            db.flush()
            product_map[prod_data["sku"]] = new_prod
            logger.info(f"Created product: {prod_data['name']} ({prod_data['sku']})")
        else:
            existing_prod.name = prod_data["name"]
            existing_prod.category_id = cat_id
            existing_prod.cost_price = prod_data["cost_price"]
            existing_prod.selling_price = prod_data["selling_price"]
            existing_prod.current_stock = prod_data["current_stock"]
            existing_prod.description = prod_data["description"]
            existing_prod.image_url = prod_data["image_url"]
            existing_prod.is_active = True
            product_map[prod_data["sku"]] = existing_prod
            logger.info(f"Updated product: {prod_data['name']} ({prod_data['sku']})")

    # 4. Seed Historical Transactions (Task 14)
    for txn_data in SEED_TRANSACTIONS:
        stmt = select(Transaction).where(Transaction.id == txn_data["id"])
        existing_txn = db.execute(stmt).scalar_one_or_none()

        if not existing_txn:
            new_txn = Transaction(
                id=txn_data["id"],
                timestamp=txn_data["timestamp"],
                payment_method=txn_data["payment_method"],
                total_revenue=txn_data["total_revenue"],
                total_profit=txn_data["total_profit"]
            )
            db.add(new_txn)
            db.flush()

            for item_data in txn_data["items"]:
                prod = product_map.get(item_data["sku"])
                t_item = TransactionItem(
                    transaction_id=new_txn.id,
                    product_id=prod.id if prod else None,
                    product_name=prod.name if prod else item_data["sku"],
                    quantity=item_data["quantity"],
                    cost_price=item_data["cost_price"],
                    selling_price=item_data["selling_price"]
                )
                db.add(t_item)
            logger.info(f"Created historical transaction: {txn_data['id']}")
        else:
            logger.info(f"Transaction already exists: {txn_data['id']}")

    db.commit()
    logger.info("Database seeding completed successfully.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
