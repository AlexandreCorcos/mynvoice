from fastapi import HTTPException
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except IntegrityError:
            # A unique/foreign-key clash that slipped past the app-level checks
            # (SQLSTATE class 23). A bare 500 tells the caller nothing; 409 does.
            await session.rollback()
            raise HTTPException(
                status_code=409, detail="That change conflicts with existing data."
            )
        except DBAPIError as exc:
            # A value that overflows its column — a 15-digit amount into
            # numeric(12,2), a tax rate past numeric(5,2), a string longer than
            # its VARCHAR — arrives from asyncpg as a data exception (SQLSTATE
            # class 22) and, unhandled, becomes a bare 500. It is not a server
            # fault, it is out-of-range input, so answer 422. Anything else
            # (a lost connection, class 08) is a real error and re-raised.
            await session.rollback()
            sqlstate = getattr(getattr(exc, "orig", None), "sqlstate", "") or ""
            if sqlstate.startswith("22"):
                raise HTTPException(
                    status_code=422,
                    detail="A value is out of the allowed range or too long.",
                )
            raise
        except Exception:
            await session.rollback()
            raise
