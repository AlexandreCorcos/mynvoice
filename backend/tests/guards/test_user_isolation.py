"""Guard: account isolation (AI_RULES R4 — the one boundary in the system).

MYNVOICE has no tenants. ``users.id`` is the only wall between one account and
the next, and it is enforced *by hand* in every query — there is no framework
guarantee behind it. A route handler that reads or writes owned data and forgets
the ``user_id`` filter leaks another account's clients, invoices, amounts and
bank details.

Per-function AST scan: for each route handler, if its body runs a ``select(...)``
it must also mention ``user_id`` somewhere in that handler. This catches a *new*
handler that queries owned data unscoped even when its neighbours in the same
file scope correctly — a strict tightening over the earlier file-level check.

It checks for the *presence* of ``user_id`` in the handler, not which model, so
an aliased model (``Client as ClientModel``) does not fool it. Refinement (proving
the filter is on the same query, `assert_owned` on every foreign reference) is a
later step, deliberately not done brittly.

Proven to fail on a planted defect: a handler with ``select(Invoice)`` and no
``user_id`` is rejected (2026-09-23).
"""
from __future__ import annotations

import ast
import pathlib

ROUTES = pathlib.Path(__file__).resolve().parents[2] / "app" / "api" / "routes"

# Files legitimately not user-scoped: auth works off email/token, admin surfaces
# read across accounts on purpose. Widen deliberately or not at all.
NOT_USER_SCOPED = {"__init__.py", "auth.py", "admin.py", "sysctrl.py", "feedback.py"}

# Individual handlers that deliberately do not scope (none yet). Format "file.py:name".
HANDLER_ALLOW: set[str] = set()


def test_every_data_handler_scopes_by_user_id():
    offenders = []
    for path in sorted(ROUTES.glob("*.py")):
        if path.name in NOT_USER_SCOPED:
            continue
        src = path.read_text(encoding="utf-8")
        tree = ast.parse(src)
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            seg = ast.get_source_segment(src, node) or ""
            if "select(" in seg and "user_id" not in seg:
                key = f"{path.name}:{node.name}"
                if key not in HANDLER_ALLOW:
                    offenders.append(f"{key} (line {node.lineno})")
    assert not offenders, (
        "these handlers query data without any user_id scoping (R4 isolation): "
        f"{offenders}. Scope the query by user_id, or add the handler to "
        "HANDLER_ALLOW with a reason."
    )
