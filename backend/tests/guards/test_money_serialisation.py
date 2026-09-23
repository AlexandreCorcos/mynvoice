"""Guard: money fields use the ``Money`` / ``Numeric`` alias, never bare Decimal
(AI_RULES R5, memory: api-returns-money-as-strings).

A bare ``Decimal`` field serialises to a JSON string, which reintroduces the
v0.14.0 bug where clients did arithmetic on text. Every currency or decimal
field on a schema must be annotated ``Money`` or ``Numeric`` (defined in
``app/schemas/types.py``), which serialise to a JSON number while staying
Decimal in Python.

AST-based: it reads annotations, so ``Decimal`` in a comment or a docstring is
ignored. ``types.py`` itself is exempt — it *defines* the alias over Decimal.

Proven to fail on a planted defect: a schema field ``amount: Decimal`` is
rejected (2026-09-23).
"""
from __future__ import annotations

import ast
import pathlib

SCHEMAS = pathlib.Path(__file__).resolve().parents[2] / "app" / "schemas"


def _mentions_decimal(node: ast.expr | None) -> bool:
    return node is not None and any(
        isinstance(n, ast.Name) and n.id == "Decimal" for n in ast.walk(node)
    )


def test_no_bare_decimal_annotation_on_schema_fields():
    offenders = []
    for path in sorted(SCHEMAS.glob("*.py")):
        if path.name == "types.py":
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.AnnAssign) and _mentions_decimal(node.annotation):
                offenders.append(f"{path.name}:{node.lineno}")
    assert not offenders, (
        "these schema fields are typed as bare Decimal — use Money or Numeric "
        f"(app/schemas/types.py) so JSON stays a number: {offenders}"
    )
