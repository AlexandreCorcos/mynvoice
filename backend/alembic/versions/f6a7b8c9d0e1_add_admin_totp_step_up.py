"""add admin totp step-up

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-30

Columns are on `users` rather than a side table: they are one-to-one with the
account, always read together with it, and only ever populated for admins.
"""

import sqlalchemy as sa
from alembic import op

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("admin_totp_secret", sa.String(64), nullable=True))
    op.add_column(
        "users",
        sa.Column("admin_totp_confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users", sa.Column("admin_totp_last_step", sa.BigInteger(), nullable=True)
    )
    op.add_column("users", sa.Column("admin_stepup_hash", sa.String(128), nullable=True))
    op.add_column(
        "users",
        sa.Column("admin_stepup_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "admin_stepup_expires_at")
    op.drop_column("users", "admin_stepup_hash")
    op.drop_column("users", "admin_totp_last_step")
    op.drop_column("users", "admin_totp_confirmed_at")
    op.drop_column("users", "admin_totp_secret")
