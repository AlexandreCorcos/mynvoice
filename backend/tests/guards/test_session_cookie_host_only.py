"""Guard: the session cookie stays host-only (AI_RULES R4, memory: sessions).

The cookie must never carry a ``Domain`` attribute. ``Domain=.mynvoice.com``
would hand the session to *every* subdomain — DNS resolves all of them — so
anything squatting on one could receive it. The cookie is host-only on the
API's own hostname, on purpose.

AST-based: it checks the keyword args of every ``set_cookie`` / ``delete_cookie``
call, so the word "Domain" in the module docstring (which explains this very
rule) is ignored.

Proven to fail on a planted defect: adding ``domain=".mynvoice.com"`` to a
``set_cookie`` call is rejected (2026-09-23).
"""
from __future__ import annotations

import ast
import pathlib

COOKIES = pathlib.Path(__file__).resolve().parents[2] / "app" / "core" / "cookies.py"
COOKIE_CALLS = {"set_cookie", "delete_cookie"}


def test_no_domain_attribute_on_session_cookies():
    tree = ast.parse(COOKIES.read_text(encoding="utf-8"))
    offenders = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        name = func.attr if isinstance(func, ast.Attribute) else getattr(func, "id", None)
        if name in COOKIE_CALLS:
            for kw in node.keywords:
                if kw.arg and kw.arg.lower() == "domain":
                    offenders.append(f"cookies.py:{node.lineno}")
    assert not offenders, (
        "a session cookie is being set with a Domain attribute "
        f"{offenders} — keep it host-only (R4). Remove the domain= argument."
    )
