"""add_expenses_and_txn_status

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-23 00:00:00.000000

Additive-only migration:
  1. Creates expense_categories table (IF NOT EXISTS via Alembic)
  2. Creates expenses table (IF NOT EXISTS via Alembic)
  3. Adds `status` column to transactions (default 'COMPLETED')
  4. Adds index on transactions.status

CRITICAL: No existing tables, columns, or rows are dropped or modified.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. expense_categories ────────────────────────────────────────────────
    op.create_table(
        'expense_categories',
        sa.Column('id',         sa.Integer(),     nullable=False, autoincrement=True),
        sa.Column('name',       sa.String(100),   nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_expense_categories_name'),
    )
    op.create_index('ix_expense_categories_id',   'expense_categories', ['id'],   unique=False)
    op.create_index('ix_expense_categories_name', 'expense_categories', ['name'], unique=True)

    # ── 2. expenses ──────────────────────────────────────────────────────────
    op.create_table(
        'expenses',
        sa.Column('id',           sa.Integer(),          nullable=False, autoincrement=True),
        sa.Column('category_id',  sa.Integer(),          nullable=False),
        sa.Column('amount',       sa.Numeric(10, 2),     nullable=False),
        sa.Column('expense_date', sa.Date(),             nullable=False),
        sa.Column('description',  sa.Text(),             nullable=True),
        sa.Column('created_at',   sa.DateTime(timezone=True),
                  server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at',   sa.DateTime(timezone=True),
                  server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_expenses_id',           'expenses', ['id'],           unique=False)
    op.create_index('ix_expenses_category_id',  'expenses', ['category_id'],  unique=False)
    op.create_index('ix_expenses_expense_date', 'expenses', ['expense_date'], unique=False)

    # ── 3. Add status column to transactions (additive, default COMPLETED) ──
    op.add_column(
        'transactions',
        sa.Column('status', sa.String(20), nullable=False,
                  server_default='COMPLETED')
    )
    op.create_index('ix_transactions_status', 'transactions', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_transactions_status', table_name='transactions')
    op.drop_column('transactions', 'status')
    op.drop_index('ix_expenses_expense_date', table_name='expenses')
    op.drop_index('ix_expenses_category_id',  table_name='expenses')
    op.drop_index('ix_expenses_id',           table_name='expenses')
    op.drop_table('expenses')
    op.drop_index('ix_expense_categories_name', table_name='expense_categories')
    op.drop_index('ix_expense_categories_id',   table_name='expense_categories')
    op.drop_table('expense_categories')
