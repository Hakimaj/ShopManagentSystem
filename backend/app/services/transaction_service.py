import random
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.transaction import CheckoutRequest
from app.models.transaction import Transaction
from app.core.exceptions import EntityNotFoundException, BusinessValidationException

class TransactionService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = TransactionRepository(db)
        self.product_repository = ProductRepository(db)

    def process_checkout(self, checkout_in: CheckoutRequest, user_id: int | None = None) -> Transaction:
        if not checkout_in.items:
            raise BusinessValidationException("Checkout items cannot be empty.")

        # 1. Lock and validate all products & stock
        validated_items = []
        total_revenue = Decimal("0.00")
        total_profit = Decimal("0.00")

        # Begin atomic checks
        for item in checkout_in.items:
            product = self.product_repository.get_by_id(item.product_id)
            if not product or not product.is_active:
                raise EntityNotFoundException(f"Product ID {item.product_id} is unavailable or not found.")

            if item.quantity <= 0:
                raise BusinessValidationException(f"Invalid quantity {item.quantity} for product '{product.name}'.")

            if product.current_stock < item.quantity:
                raise BusinessValidationException(
                    f"Insufficient stock for '{product.name}'. Requested: {item.quantity}, Available: {product.current_stock}"
                )

            # Deduct stock
            product.current_stock -= item.quantity

            line_revenue = item.sold_price * Decimal(item.quantity)
            line_cost = product.cost_price * Decimal(item.quantity)
            line_profit = line_revenue - line_cost

            total_revenue += line_revenue
            total_profit += line_profit

            validated_items.append({
                "product_id": product.id,
                "product_name": product.name,
                "quantity": item.quantity,
                "cost_price": product.cost_price,
                "selling_price": item.sold_price
            })

        # 2. Generate Transaction Reference ID
        txn_id = f"TXN-{random.randint(1000, 9999)}"
        # Ensure unique ID
        while self.repository.get_by_id(txn_id):
            txn_id = f"TXN-{random.randint(1000, 9999)}"

        txn_data = {
            "id": txn_id,
            "timestamp": datetime.now(timezone.utc),
            "payment_method": checkout_in.payment_method,
            "total_revenue": total_revenue,
            "total_profit": total_profit,
            "user_id": user_id,
            "status": "COMPLETED"   # explicit — never rely on DB column default
        }

        # 3. Save atomically and return
        try:
            return self.repository.create(txn_data, validated_items)
        except Exception as e:
            self.db.rollback()
            raise BusinessValidationException(f"Transaction failed: {str(e)}")

    def get_transaction(self, txn_id: str) -> Transaction:
        txn = self.repository.get_by_id(txn_id)
        if not txn:
            raise EntityNotFoundException(f"Transaction '{txn_id}' not found.")
        return txn

    def list_transactions(
        self,
        period: str = "all",
        custom_date: str | None = None,
        payment_method: str | None = None,
        page: int = 1,
        size: int = 50
    ) -> tuple[list[Transaction], int, int]:
        start_date, end_date = self._get_date_range(period, custom_date)
        skip = (page - 1) * size if page > 1 else 0
        items, total = self.repository.list_transactions(
            start_date=start_date,
            end_date=end_date,
            payment_method=payment_method,
            skip=skip,
            limit=size
        )
        pages = (total + size - 1) // size if total > 0 else 0
        return items, total, pages

    def get_dashboard_summary(
        self,
        period: str = "all",
        custom_date: str | None = None,
        payment_method: str | None = None
    ) -> dict:
        import logging
        logger = logging.getLogger("transaction_service")

        start_date, end_date = self._get_date_range(period, custom_date)
        kpi = self.repository.get_dashboard_aggregates(
            start_date=start_date,
            end_date=end_date,
            payment_method=payment_method
        )

        # Fetch expenses for the same period.
        # Wrapped in a broad try/except so that if the expenses table doesn't
        # exist yet (migration pending) or any other DB error occurs, the
        # dashboard still returns valid data — it just shows 0 for expenses.
        total_expenses = Decimal("0.00")
        try:
            from app.repositories.expense_repository import ExpenseRepository
            exp_repo = ExpenseRepository(self.db)
            start_d = start_date.date() if start_date else None
            end_d   = end_date.date()   if end_date   else None
            total_expenses = exp_repo.get_total(start_date=start_d, end_date=end_d)
        except Exception as exc:
            logger.warning(
                f"Dashboard: could not fetch expenses (table may not exist yet): {exc}"
            )
            total_expenses = Decimal("0.00")

        gross_profit = kpi["filtered_profit"]
        net_profit   = gross_profit - total_expenses

        kpi["total_expenses"] = total_expenses
        kpi["net_profit"]     = net_profit

        return {
            "kpi": kpi,
            "period": period
        }

    def process_refund(self, txn_id: str) -> Transaction:
        """
        Reverses a completed transaction:
        - Restores product stock for all line items
        - Marks transaction status as REFUNDED
        Already-refunded transactions are rejected.
        """
        txn = self.repository.get_by_id(txn_id)
        if not txn:
            raise EntityNotFoundException(f"Transaction '{txn_id}' not found.")

        if getattr(txn, "status", "COMPLETED") == "REFUNDED":
            raise BusinessValidationException("This transaction has already been refunded.")

        # Restore stock for each item
        for item in txn.items:
            if item.product_id:
                product = self.product_repository.get_by_id(item.product_id)
                if product:
                    product.current_stock += item.quantity

        # Mark as refunded
        txn.status = "REFUNDED"
        self.db.commit()
        self.db.refresh(txn)
        return txn

    def _get_date_range(self, period: str, custom_date: str | None) -> tuple[datetime | None, datetime | None]:
        now = datetime.now(timezone.utc)
        if period == "daily":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            return start, end
        elif period == "monthly":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            return start, None
        elif period == "half_year":
            start = now - timedelta(days=180)
            return start, None
        elif period == "yearly":
            start = now - timedelta(days=365)
            return start, None
        elif period == "custom" and custom_date:
            try:
                d = datetime.strptime(custom_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                start = d.replace(hour=0, minute=0, second=0, microsecond=0)
                end = d.replace(hour=23, minute=59, second=59, microsecond=999999)
                return start, end
            except ValueError:
                pass
        return None, None
