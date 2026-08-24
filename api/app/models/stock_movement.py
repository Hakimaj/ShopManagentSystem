from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    type = Column(Enum(MovementType), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Optional fields for context
    reference_type = Column(String(50), nullable=True)  # e.g., "TRANSACTION", "ADJUSTMENT", "INITIAL"
    reference_id = Column(Integer, nullable=True)       # e.g., transaction_id, adjustment_id
    notes = Column(String(255), nullable=True)

    # Relationships
    product = relationship("Product", back_populates="stock_movements")