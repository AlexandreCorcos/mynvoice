"""Guard: account isolation (AI_RULES R4 — the one boundary in the system).

MYNVOICE has no tenants. ``users.id`` is the only wall between one account and
the next, and it is enforced *by hand* in every query — there is no framework
guarantee behind it. A route that reads or writes owned data and forgets the
``user_id`` filter leaks another account's clients, invoices, amounts and bank
details.

This is a class-of-defect scan, not a proof of every query: any route module
that runs a ``select(...)`` must mention ``user_id`` somewhere. It fails the
moment a new route queries owned data without scoping it. Refinement (per-query
AST scoping, allow aliased models) is a later tightening, deliberately not done
yet rather than done brittly.

Proven to fail on a planted defect: a route file with ``select(Invoice)`` and no
``user_id`` is rejected (2026-09-23).
"""
from __future__ import annotations

import pathlib

ROUTES = pathlib.Path(__file__).resolve().parents[2] / "app" / "api" / "routes"

# Legitimately not user-scoped: auth works off email/token, admin surfaces read
# across accounts on purpose. Widen this list deliberately or not at all.
NOT_USER_SCOPED = {"__init__.py", "auth.py", "admin.py", "sysctrl.py", "feedback.py"}


def test_every_data_route_scopes_by_user_id():
    offenders = []
    for path in sorted(ROUTES.glob("*.py")):
        if path.name in NOT_USER_SCOPED:
            continue
        src = path.read_text(encoding="utf-8")
        if "select(" in src and "user_id" not in src:
            offenders.append(path.name)
    assert not offenders, (
        "these route modules query data without any user_id scoping "
        f"(R4 isolation): {offenders}. Scope every owned query by user_id, "
        "or add the file to NOT_USER_SCOPED with a reason."
    )
