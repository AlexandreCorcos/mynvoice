"""update donation target default to 400

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-06-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "d3e4f5a6b7c8"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "donation_config",
        "monthly_target",
        existing_type=sa.Numeric(10, 2),
        server_default="400.00",
    )
    # Update existing rows that still have the old 1000 default
    op.execute("UPDATE donation_config SET monthly_target = 400.00 WHERE monthly_target = 1000.00")


def downgrade() -> None:
    op.alter_column(
        "donation_config",
        "monthly_target",
        existing_type=sa.Numeric(10, 2),
        server_default="1000.00",
    )
    op.execute("UPDATE donation_config SET monthly_target = 1000.00 WHERE monthly_target = 400.00")
