"""add password reset token to users

Revision ID: c2d3e4f5a6b7
Revises: b1e2f3a4d5c6
Create Date: 2026-06-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "c2d3e4f5a6b7"
down_revision = "b1e2f3a4d5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_reset_token", sa.String(128), nullable=True))
    op.add_column("users", sa.Column("password_reset_token_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_password_reset_token", "users", ["password_reset_token"])


def downgrade() -> None:
    op.drop_index("ix_users_password_reset_token", table_name="users")
    op.drop_column("users", "password_reset_token_expires_at")
    op.drop_column("users", "password_reset_token")
