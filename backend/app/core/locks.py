"""Transaction-scoped locks for the few places that need serialising.

The one boundary that isn't a `user_id` check is *number generation*. Invoice
and payment numbers are derived from the highest existing value (or a counter
column), and that read-modify-write races: two creates fired at once read the
same number and both issue it. There is no unique constraint behind it, so the
duplicate is stored silently — two invoices with the same legal number.

A transaction-scoped Postgres advisory lock keyed on the account makes the
second create wait until the first commits, so it reads the already-incremented
value. The lock releases automatically at commit or rollback; nothing to clean
up, and it only serialises the same account's own concurrent creates.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def lock_user_numbering(db: AsyncSession, user_id) -> None:
    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:k))"),
        {"k": f"numbering:{user_id}"},
    )
