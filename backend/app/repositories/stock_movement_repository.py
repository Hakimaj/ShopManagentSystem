from datetime import datetime, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session, joinedload
from app.repositories.base import BaseRepository
from app.models.stock_movement import StockMovement, MovementType
from app.models.product import Product

class StockMovementRepository(BaseRepository):
    def create_movement(self, movement_data: dict) -> StockMovement:
        """Create a new stock movement record"""
        movement = StockMovement(**movement_data)
        self.db.add(movement)
        self.db.commit()
        self.db.refresh(movement)
        return movement

    def list_movements(
        self,
        movement_type: MovementType | None = None,
        period: str = "all",
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[StockMovement], int]:
        """List stock movements with filters"""
        query = (
            select(StockMovement, Product.name.label('product_name'))
            .join(Product, StockMovement.product_id == Product.id)
            .order_by(StockMovement.timestamp.desc())
        )

        # Filter by movement type
        if movement_type:
            query = query.where(StockMovement.type == movement_type)

        # Filter by time period
        if period != "all":
            now = datetime.utcnow()
            if period == "today":
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == "month":
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            elif period == "half_year":
                start_date = now - timedelta(days=180)
            elif period == "year":
                start_date = now - timedelta(days=365)
            else:
                start_date = None

            if start_date:
                query = query.where(StockMovement.timestamp >= start_date)

        # Count total matching results
        count_query = select(func.count()).select_from(query.order_by(None).subquery())
        total = self.db.execute(count_query).scalar_one()

        # Apply pagination
        items_query = query.offset(skip).limit(limit)
        results = self.db.execute(items_query).all()

        # Convert results to include product name
        movements_with_names = []
        for movement, product_name in results:
            movement.product_name = product_name
            movements_with_names.append(movement)

        return movements_with_names, total