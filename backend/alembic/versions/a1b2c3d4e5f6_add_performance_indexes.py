"""add_performance_indexes

Revision ID: a1b2c3d4e5f6
Revises: 88bb8187aadd
Create Date: 2026-08-22 00:00:00.000000

Additive-only migration: adds composite and covering indexes to speed up
frequently-run queries on the 1 GB / 1 vCPU Aiven DB without touching
any existing tables, columns, or data.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '88bb8187aadd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── products ────────────────────────────────────────────────────────────
    # Speeds up inventory list filtered by category + active flag
    op.create_index(
        'ix_products_category_id_is_active',
        'products',
        ['category_id', 'is_active'],
        unique=False
    )
    # Speeds up duplicate-name lookup in ProductService
    op.create_index(
        'ix_products_is_active',
        'products',
        ['is_active'],
        unique=False
    )

    # ── transaction_items ───────────────────────────────────────────────────
    # Composite index for JOIN between transactions & items in dashboard agg
    op.create_index(
        'ix_transaction_items_txn_product',
        'transaction_items',
        ['transaction_id', 'product_id'],
        unique=False
    )
    # Speeds up items-sold aggregation filtered by product
    op.create_index(
        'ix_transaction_items_product_id',
        'transaction_items',
        ['product_id'],
        unique=False
    )

    # ── transactions ────────────────────────────────────────────────────────
    # Composite covering index for dashboard period + payment filter queries
    op.create_index(
        'ix_transactions_timestamp_payment',
        'transactions',
        ['timestamp', 'payment_method'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_transactions_timestamp_payment', table_name='transactions')
    op.drop_index('ix_transaction_items_product_id', table_name='transaction_items')
    op.drop_index('ix_transaction_items_txn_product', table_name='transaction_items')
    op.drop_index('ix_products_is_active', table_name='products')
    op.drop_index('ix_products_category_id_is_active', table_name='products')
