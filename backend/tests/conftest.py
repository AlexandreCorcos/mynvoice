"""Shared test fakes (AI_RULES R3). DB-free, stdlib only.

Unit tests never touch Postgres: they script an ``AsyncSession`` with
``FakeSession`` and hand back rows as ``SimpleNamespace``. This keeps the
suite in the seconds the gate can afford to run on every push.

    async def test_owned():
        db = FakeSession([FakeResult(scalar=SimpleNamespace(id="x"))])
        await assert_owned(db, Client, "x", "u1", "nope")   # no raise
"""
from __future__ import annotations

from types import SimpleNamespace


class FakeResult:
    """The return of ``await session.execute(...)``: script the accessor you use."""

    def __init__(self, *, scalar=None, scalars=None, one=None):
        self._scalar = scalar
        self._scalars = scalars if scalars is not None else []
        self._one = one

    def scalar_one_or_none(self):
        return self._scalar

    def scalar_one(self):
        return self._one if self._one is not None else self._scalar

    def scalars(self):
        return SimpleNamespace(
            all=lambda: list(self._scalars),
            first=lambda: (self._scalars[0] if self._scalars else None),
        )


class FakeSession:
    """A minimal async ``AsyncSession`` stand-in.

    ``execute`` returns the scripted results in order; ``add`` / ``commit`` /
    ``refresh`` / ``flush`` are recorded no-ops so a handler under test runs
    to the end without a database.
    """

    def __init__(self, results=None):
        self._results = list(results or [])
        self.added: list = []
        self.committed = False

    async def execute(self, *_args, **_kwargs):
        if not self._results:
            return FakeResult()
        return self._results.pop(0)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.committed = True

    async def refresh(self, *_args, **_kwargs):
        return None

    async def flush(self, *_args, **_kwargs):
        return None
