from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session, joinedload
from app.repositories.base import BaseRepository
from app.models.product import Product

class ProductRepository(BaseRepository):
    def get_by_id(self, product_id: int) -> Product | None:
        stmt = (
            select(Product)
            .options(joinedload(Product.category))
            .where(Product.id == product_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_sku(self, sku: str) -> Product | None:
        stmt = (
            select(Product)
            .options(joinedload(Product.category))
            .where(Product.sku == sku)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_name(
        self,
        name: str,
        category_id: int | None = None,
        active_only: bool = True
    ) -> list[Product]:
        """Return all products whose name matches (case-insensitive)."""
        stmt = (
            select(Product)
            .options(joinedload(Product.category))
            .where(func.lower(Product.name) == name.lower().strip())
        )
        if active_only:
            stmt = stmt.where(Product.is_active == True)
        if category_id is not None:
            stmt = stmt.where(Product.category_id == category_id)
        return list(self.db.execute(stmt).scalars().unique().all())

    def list_products(
        self,
        search: str | None = None,
        category_id: int | None = None,
        is_active: bool | None = True,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[list[Product], int]:
        query = select(Product).options(joinedload(Product.category))

        if is_active is not None:
            query = query.where(Product.is_active == is_active)

        if category_id is not None:
            query = query.where(Product.category_id == category_id)

        if search:
            search_term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.description.ilike(search_term)
                )
            )

        # Count total matching query
        count_query = select(func.count()).select_from(query.order_by(None).subquery())
        total = self.db.execute(count_query).scalar_one()

        # Apply ordering and pagination
        items_query = query.order_by(Product.name.asc()).offset(skip).limit(limit)
        items = list(self.db.execute(items_query).scalars().all())

        return items, total

    def create(self, product_data: dict) -> Product:
        product = Product(**product_data)
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def update(self, product: Product, update_data: dict) -> Product:
        for key, value in update_data.items():
            if hasattr(product, key) and value is not None:
                setattr(product, key, value)
        self.db.commit()
        self.db.refresh(product)
        return product

    def update_stock(self, product: Product, new_stock: int) -> Product:
        product.current_stock = new_stock
        self.db.commit()
        self.db.refresh(product)
        return product

    def soft_delete(self, product: Product) -> Product:
        product.is_active = False
        self.db.commit()
        self.db.refresh(product)
        return product
