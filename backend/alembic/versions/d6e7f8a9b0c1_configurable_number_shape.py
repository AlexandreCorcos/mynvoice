"""configurable_number_shape

The separator and the zero-padding of a derived invoice number were fixed at
"-" and five digits. An account migrating from another system has series
already printed on documents in another shape - INV-T0006, INV-A009 - and the
numbering has to carry on in the shape the client has seen.

Defaults reproduce the old behaviour exactly, so nothing changes for anyone
who does not set them.

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-08-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6e7f8a9b0c1'
down_revision: Union[str, None] = 'c5d6e7f8a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("companies", "clients"):
        op.add_column(table, sa.Column(
            "number_separator", sa.String(5), nullable=False, server_default="-"
        ))
        op.add_column(table, sa.Column(
            "number_padding", sa.Integer(), nullable=False, server_default="5"
        ))


def downgrade() -> None:
    for table in ("companies", "clients"):
        op.drop_column(table, "number_padding")
        op.drop_column(table, "number_separator")
