import uuid as uuid_mod

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate
from app.schemas.user import UserResponse, UserUpdate
from app.services import storage

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


# --- User Profile ---


@router.get("/me", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    return user


# --- Company Profile ---


@router.get("/company", response_model=CompanyResponse | None)
async def get_company(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.user_id == user.id)
    )
    return result.scalar_one_or_none()


@router.post("/company", response_model=CompanyResponse, status_code=201)
async def create_company(
    data: CompanyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.user_id == user.id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company profile already exists",
        )

    company = Company(user_id=user.id, **data.model_dump())
    db.add(company)
    await db.flush()
    return company


@router.put("/company", response_model=CompanyResponse)
async def update_company(
    data: CompanyUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.user_id == user.id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company profile not found",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    return company


# --- Logo Upload ---


@router.post("/company/logo")
async def upload_logo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed")

    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")

    if not storage.is_configured():
        raise HTTPException(status_code=503, detail="File storage is not configured")

    result = await db.execute(select(Company).where(Company.user_id == user.id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Create a business profile first")

    if company.logo_url:
        await storage.delete_file(company.logo_url)

    ext = (file.filename or "logo.png").rsplit(".", 1)[-1] or "png"
    filename = f"{uuid_mod.uuid4().hex}.{ext}"

    try:
        logo_url = await storage.upload_file(contents, "logos", filename, file.content_type or "image/png")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {str(e)}")

    company.logo_url = logo_url

    return {"logo_url": logo_url}


@router.delete("/company/logo", status_code=204)
async def delete_logo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.user_id == user.id)
    )
    company = result.scalar_one_or_none()
    if not company or not company.logo_url:
        return

    await storage.delete_file(company.logo_url)
    company.logo_url = None
