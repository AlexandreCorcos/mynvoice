"""Shared field types for the API schemas."""

from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# Pydantic serialises Decimal as a JSON *string* by default ("840.00"), which
# leaves every client doing arithmetic on text: `a + b` concatenates and
# `x > 0` compares NaN. Decimal is still the right type in Python — exact
# arithmetic, no binary rounding on money — so this keeps validation and
# internal maths unchanged and only widens the JSON representation to a
# number, which is what the TypeScript types have always claimed it was.
#
# `when_used="json"` means Python-mode dumps still hand back Decimal.
Money = Annotated[
    Decimal,
    PlainSerializer(float, return_type=float, when_used="json"),
]

# Same treatment for the non-currency decimals — quantities and tax rates.
Numeric = Money
