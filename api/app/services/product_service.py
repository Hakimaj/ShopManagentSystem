from sqlalchemy.orm import Session
from app.repositories.product_repository import ProductRepository
from app.repositories.category_repository import CategoryRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.models.product import Product
from app.core.exceptions import EntityNotFoundException, DuplicateEntityException, BusinessValidationException

class ProductService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ProductRepository(db)
        self.category_repository = CategoryRepository(db)

    def get_product_by_id(self, product_id: int) -> Product:
        product = self.repository.get_by_id(product_id)
        if not product:
            raise EntityNotFoundException(f"Product with ID {product_id} not found.")
        return product

    def get_product_by_sku(self, sku: str) -> Product:
        product = self.repository.get_by_sku(sku)
        if not product:
            raise EntityNotFoundException(f"Product with SKU '{sku}' not found.")
        return product

    def list_products(
        self,
        search: str | None = None,
        category_id: int | None = None,
        is_active: bool | None = True,
        page: int = 1,
        size: int = 50
    ) -> tuple[list[Product], int, int]:
        if page < 1:
            page = 1
        if size < 1:
            size = 50

        skip = (page - 1) * size
        items, total = self.repository.list_products(
            search=search,
            category_id=category_id,
            is_active=is_active,
            skip=skip,
            limit=size
        )
        total_pages = (total + size - 1) // size if total > 0 else 0
        return items, total, total_pages

    def create_product(self, product_in: ProductCreate) -> Product:
        # 1. Check SKU Uniqueness
        clean_sku = product_in.sku.strip()
        existing = self.repository.get_by_sku(clean_sku)
        if existing:
            raise DuplicateEntityException(f"Product with SKU '{clean_sku}' already exists.")

        # 2. Check Category existence
        category = self.category_repository.get_by_id(product_in.category_id)
        if not category:
            raise EntityNotFoundException(f"Category with ID {product_in.category_id} not found.")

        # 3. Create Product
        data = product_in.model_dump()
        data["sku"] = clean_sku
        data["name"] = product_in.name.strip()
        return self.repository.create(data)

    def update_product(self, product_id: int, product_in: ProductUpdate) -> Product:
        product = self.get_product_by_id(product_id)

        update_dict = product_in.model_dump(exclude_unset=True)

        # Validate SKU if updated
        if "sku" in update_dict and update_dict["sku"] is not None:
            clean_sku = update_dict["sku"].strip()
            existing = self.repository.get_by_sku(clean_sku)
            if existing and existing.id != product_id:
                raise DuplicateEntityException(f"Product with SKU '{clean_sku}' already exists.")
            update_dict["sku"] = clean_sku

        # Validate Category if updated
        if "category_id" in update_dict and update_dict["category_id"] is not None:
            category = self.category_repository.get_by_id(update_dict["category_id"])
            if not category:
                raise EntityNotFoundException(f"Category with ID {update_dict['category_id']} not found.")

        if "name" in update_dict and update_dict["name"] is not None:
            update_dict["name"] = update_dict["name"].strip()

        return self.repository.update(product, update_dict)

    def adjust_stock(self, product_id: int, new_stock: int) -> Product:
        if new_stock < 0:
            raise BusinessValidationException("Stock level cannot be negative.")
        product = self.get_product_by_id(product_id)
        return self.repository.update_stock(product, new_stock)

    def deactivate_product(self, product_id: int) -> Product:
        product = self.get_product_by_id(product_id)
        return self.repository.soft_delete(product)
