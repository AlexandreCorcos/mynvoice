"""add cancelled invoice status

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-25
"""

from alembic import op

revision = "b8c9d0e1f2a3"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Postgres stores the enum member *names* (upper-case), so the new label
    # is 'CANCELLED'. ALTER TYPE ... ADD VALUE cannot run inside the migration's
    # transaction on older servers, so use Alembic's autocommit block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'CANCELLED'")


def downgrade() -> None:
    # Postgres has no DROP VALUE; removing an enum label means recreating the
    # type and rewriting every column that uses it. Left as a no-op — a value
    # that nothing references any more is harmless.
    pass
