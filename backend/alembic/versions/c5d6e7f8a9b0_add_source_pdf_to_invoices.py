"""add_source_pdf_to_invoices

Imported invoices carry the document that was actually issued, from whatever
system produced it. Regenerating a PDF for one of those would print today's
company profile onto a historical record, so the original is stored instead
and served in its place.

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-08-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5d6e7f8a9b0'
down_revision: Union[str, None] = 'b4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The storage key, not a public URL: an invoice is a private document and
    # is served through the authenticated PDF route like a generated one.
    op.add_column('invoices', sa.Column('source_pdf_key', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('source_pdf_name', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('invoices', 'source_pdf_name')
    op.drop_column('invoices', 'source_pdf_key')
