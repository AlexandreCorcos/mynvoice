"""add_pdf_template_to_invoices

Revision ID: f7e1a2b3c4d5
Revises: 3db3aa2ad8d2
Create Date: 2026-04-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7e1a2b3c4d5'
down_revision: Union[str, None] = '3db3aa2ad8d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('invoices', sa.Column(
        'pdf_template',
        sa.String(50),
        nullable=False,
        server_default='classic'
    ))


def downgrade() -> None:
    op.drop_column('invoices', 'pdf_template')
