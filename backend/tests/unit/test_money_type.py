"""The ``Money`` contract (AI_RULES R5, memory: api-returns-money-as-strings).

Money is a ``Decimal`` in Python (exact arithmetic) but must serialise to a
JSON *number*, not a string — a string leaves every client doing ``a + b`` on
text. This imports only ``app.schemas.types`` + pydantic, so it stays DB-free.
"""
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.types import Money


class _Doc(BaseModel):
    total: Money


def test_money_serialises_to_json_number():
    doc = _Doc(total=Decimal("840.00"))
    # JSON mode: a float, so the client can do maths on it.
    assert doc.model_dump(mode="json")["total"] == 840.0
    assert isinstance(doc.model_dump(mode="json")["total"], float)


def test_money_stays_decimal_in_python():
    doc = _Doc(total=Decimal("840.00"))
    # Python mode: still Decimal, so server-side money maths stays exact.
    assert doc.model_dump()["total"] == Decimal("840.00")
    assert isinstance(doc.total, Decimal)
