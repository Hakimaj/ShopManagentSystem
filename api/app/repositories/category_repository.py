from sqlalchemy import select
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.category import Category

class CategoryRepository(BaseRepository):
    def get_by_id(self, category_id: int) -> Category | None:
        stmt = select(Category).where(Category.id == category_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_name(self, name: str) -> Category | None:
        stmt = select(Category).where(Category.name == name)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[Category]:
        stmt = select(Category).order_by(Category.name.asc())
        return list(self.db.execute(stmt).scalars().all())

    def create(self, name: str) -> Category:
        category = Category(name=name)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update(self, category: Category, name: str) -> Category:
        category.name = name
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category: Category) -> None:
        self.db.delete(category)
        self.db.commit()
