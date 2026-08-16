from datetime import datetime
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload
from app.repositories.base import BaseRepository
from app.models.transaction import Transaction, TransactionItem

class TransactionRepository(BaseRepository):
    def get_by_id(self, txn_id: str) -> Transaction | None:
        stmt = (
            select(Transaction)
            .options(joinedload(Transaction.items))
            .where(Transaction.id == txn_id)
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def list_transactions(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        payment_method: str | None = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[list[Transaction], int]:
        query = select(Transaction).options(joinedload(Transaction.items))

        if start_date is not None:
            query = query.where(Transaction.timestamp >= start_date)
        if end_date is not None:
            query = query.where(Transaction.timestamp <= end_date)
        if payment_method and payment_method != "All":
            query = query.where(Transaction.payment_method == payment_method)

        # Count total
        base_filter_query = select(Transaction.id)
        if start_date is not None:
            base_filter_query = base_filter_query.where(Transaction.timestamp >= start_date)
        if end_date is not None:
            base_filter_query = base_filter_query.where(Transaction.timestamp <= end_date)
        if payment_method and payment_method != "All":
            base_filter_query = base_filter_query.where(Transaction.payment_method == payment_method)
        count_query = select(func.count()).select_from(base_filter_query.subquery())
        total = self.db.execute(count_query).scalar_one()

        # Fetch items
        items_query = query.order_by(Transaction.timestamp.desc()).offset(skip).limit(limit)
        items = list(self.db.execute(items_query).unique().scalars().all())

        return items, total

    def get_dashboard_aggregates(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        payment_method: str | None = None
    ) -> dict:
        # Base filter query for transactions
        txn_subquery = select(Transaction.id, Transaction.total_revenue, Transaction.total_profit)

        if start_date is not None:
            txn_subquery = txn_subquery.where(Transaction.timestamp >= start_date)
        if end_date is not None:
            txn_subquery = txn_subquery.where(Transaction.timestamp <= end_date)
        if payment_method and payment_method != "All":
            txn_subquery = txn_subquery.where(Transaction.payment_method == payment_method)

        txn_sq = txn_subquery.subquery()

        # Aggregate revenue, profit, count
        agg_stmt = select(
            func.coalesce(func.sum(txn_sq.c.total_revenue), 0),
            func.coalesce(func.sum(txn_sq.c.total_profit), 0),
            func.count(txn_sq.c.id)
        )
        rev, prof, count = self.db.execute(agg_stmt).one()

        # Count items sold in matching transactions
        items_stmt = select(func.coalesce(func.sum(TransactionItem.quantity), 0)).where(
            TransactionItem.transaction_id.in_(select(txn_sq.c.id))
        )
        items_sold = self.db.execute(items_stmt).scalar_one()

        return {
            "filtered_revenue": Decimal(str(rev)),
            "filtered_profit": Decimal(str(prof)),
            "orders_count": int(count),
            "items_sold": int(items_sold)
        }

    def create(self, txn_data: dict, items_data: list[dict]) -> Transaction:
        transaction = Transaction(**txn_data)
        self.db.add(transaction)
        self.db.flush()

        for item in items_data:
            t_item = TransactionItem(
                transaction_id=transaction.id,
                product_id=item["product_id"],
                product_name=item["product_name"],
                quantity=item["quantity"],
                cost_price=item["cost_price"],
                selling_price=item["selling_price"]
            )
            self.db.add(t_item)

        self.db.commit()
        self.db.refresh(transaction)
        return transaction
