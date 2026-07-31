from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


# The interactive docs and the OpenAPI schema hand out a complete map of the
# attack surface — every route, every field name, and which ones are
# privileged. Useful while building, pure reconnaissance in production.
_docs_enabled = settings.DEBUG

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

# Exact origins only.
#
# This used to also carry `allow_origin_regex=r"https?://.*\.mynvoice\.com"`,
# which — together with `allow_credentials=True` — handed credentialed CORS to
# *any* subdomain, over http as well as https. DNS resolves every label under
# mynvoice.com, so that was one subdomain takeover, or one attacker on the
# same network answering for http://anything.mynvoice.com, away from reading
# authenticated API responses.
#
# A black-box test does not see this. Probing evil.com and
# app.mynvoice.com.evil.com both correctly fail, because Starlette matches the
# regex with `fullmatch` — so from outside it looks like an exact allowlist.
# The hole is only visible from here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}
