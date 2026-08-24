from sqlalchemy.orm import Session
from app.repositories.stock_movement_repository import StockMovementRepository
from app.schemas.stock_movement import StockMovementCreate
from app.models.stock_movement import StockMovement, MovementType

class StockMovementService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = StockMovementRepository(db)

    def create_movement(self, movement_in: StockMovementCreate) -> StockMovement:
        """Create a new stock movement"""
        movement_data = movement_in.model_dump()
        return self.repository.create_movement(movement_data)

    def record_stock_in(
        self,
        product_id: int,
        quantity: int,
        reference_type: str = "MANUAL",
        reference_id: int | None = None,
        notes: str | None = None
    ) -> StockMovement:
        """Record stock IN movement"""
        movement_data = {
            "product_id": product_id,
            "type": MovementType.IN,
            "quantity": quantity,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "notes": notes
        }
        return self.repository.create_movement(movement_data)

    def record_stock_out(
        self,
        product_id: int,
        quantity: int,
        reference_type: str = "SALE",
        reference_id: int | None = None,
        notes: str | None = None
    ) -> StockMovement:
        """Record stock OUT movement"""
        movement_data = {
            "product_id": product_id,
            "type": MovementType.OUT,
            "quantity": quantity,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "notes": notes
        }
        return self.repository.create_movement(movement_data)

    def list_movements(
        self,
        movement_type: MovementType | None = None,
        period: str = "all",
        page: int = 1,
        size: int = 100
    ) -> tuple[list[StockMovement], int]:
        """List stock movements with pagination"""
        if page < 1:
            page = 1
        if size < 1:
            size = 100

        skip = (page - 1) * size
        return self.repository.list_movements(
            movement_type=movement_type,
            period=period,
            skip=skip,
            limit=size
        )