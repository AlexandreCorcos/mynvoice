"""Server-side administration.

Admin access is granted here and nowhere else. That is the point: reading
this repository tells an attacker how the check works, but grants them
nothing, because the grant itself requires a shell on the machine that runs
the database.

    docker compose exec backend python -m app.cli list-admins
    docker compose exec backend python -m app.cli grant-admin you@example.com
    docker compose exec backend python -m app.cli revoke-admin them@example.com
"""

import asyncio
import sys

from sqlalchemy import func, select

from app.db.session import async_session
from app.models.user import User


async def _grant(email: str, value: bool) -> int:
    async with async_session() as db:
        user = (
            await db.execute(select(User).where(func.lower(User.email) == email.lower()))
        ).scalar_one_or_none()

        if user is None:
            print(f"No account for {email}. They must sign up first.")
            return 1

        if user.is_admin == value:
            print(f"{user.email} is already {'an admin' if value else 'not an admin'}.")
            return 0

        # Refuse to remove the last admin: the panel would then be reachable
        # only by coming back here, which is exactly the situation this
        # command exists to avoid being the only escape from.
        if not value:
            others = (
                await db.execute(
                    select(func.count(User.id)).where(
                        User.is_admin.is_(True), User.id != user.id
                    )
                )
            ).scalar() or 0
            if others == 0:
                print("That is the only admin. Grant it to someone else first.")
                return 1

        user.is_admin = value
        await db.commit()
        print(f"{user.email} is {'now an admin' if value else 'no longer an admin'}.")
        return 0


async def _list() -> int:
    async with async_session() as db:
        admins = (
            (await db.execute(select(User).where(User.is_admin.is_(True))))
            .scalars()
            .all()
        )
        if not admins:
            print("No admins. Grant one with: python -m app.cli grant-admin <email>")
            return 0
        for a in admins:
            seen = a.last_login_at.isoformat() if a.last_login_at else "never"
            print(f"{a.email:40} last login {seen}")
        return 0


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1

    command, *rest = args

    if command == "list-admins":
        return asyncio.run(_list())

    if command in {"grant-admin", "revoke-admin"}:
        if not rest:
            print(f"Usage: python -m app.cli {command} <email>")
            return 1
        return asyncio.run(_grant(rest[0], command == "grant-admin"))

    print(f"Unknown command: {command}")
    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
