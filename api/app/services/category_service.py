from sqlalchemy.orm import Session
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.models.category import Category
from app.core.exceptions import EntityNotFoundException, DuplicateEntityException

class CategoryService:
    def __init__(self, db: Session):
        self.repository = CategoryRepository(db)

    def get_category_by_id(self, category_id: int) -> Category:
        category = self.repository.get_by_id(category_id)
        if not category:
            raise EntityNotFoundException(f"Category with ID {category_id} not found.")
        return category

    def list_categories(self) -> list[Category]:
        return self.repository.list_all()

    def create_category(self, category_in: CategoryCreate) -> Category:
        existing = self.repository.get_by_name(category_in.name.strip())
        if existing:
            raise DuplicateEntityException(f"Category '{category_in.name}' already exists.")
        return self.repository.create(name=category_in.name.strip())

    def update_category(self, category_id: int, category_in: CategoryUpdate) -> Category:
        category = self.get_category_by_id(category_id)

        if category_in.name is not None:
            clean_name = category_in.name.strip()
            existing = self.repository.get_by_name(clean_name)
            if existing and existing.id != category_id:
                raise DuplicateEntityException(f"Category with name '{clean_name}' already exists.")
            category = self.repository.update(category, name=clean_name)

        return category

    def delete_category(self, category_id: int) -> None:
        category = self.get_category_by_id(category_id)
        self.repository.delete(category)
