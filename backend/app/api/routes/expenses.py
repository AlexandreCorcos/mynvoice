import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.expense import Expense, ExpenseType
from app.models.expense_category import ExpenseCategory
from app.models.user import User
from app.schemas.expense import (
    ExpenseCategoryCreate,
    ExpenseCategoryResponse,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
)

router = APIRouter()


# --- Categories ---


@router.get("/categories", response_model=list[ExpenseCategoryResponse])
async def list_categories(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExpenseCategory)
        .where(ExpenseCategory.user_id == user.id)
        .order_by(ExpenseCategory.name)
    )
    return result.scalars().all()


@router.post("/categories", response_model=ExpenseCategoryResponse, status_code=201)
async def create_category(
    data: ExpenseCategoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category = ExpenseCategory(user_id=user.id, **data.model_dump())
    db.add(category)
    await db.flush()
    return category


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExpenseCategory).where(
            ExpenseCategory.id == category_id,
            ExpenseCategory.user_id == user.id,
        )
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)


# --- Expenses ---


@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    category_id: uuid.UUID | None = Query(None),
    expense_type: ExpenseType | None = Query(None),
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Expense).where(Expense.user_id == user.id)

    if category_id:
        query = query.where(Expense.category_id == category_id)
    if expense_type:
        query = query.where(Expense.expense_type == expense_type)
    if month:
        year, m = month.split("-")
        from sqlalchemy import extract

        query = query.where(
            extract("year", Expense.expense_date) == int(year),
            extract("month", Expense.expense_date) == int(m),
        )

    query = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    expense = Expense(user_id=user.id, **data.model_dump())
    db.add(expense)
    await db.flush()
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: uuid.UUID,
    data: ExpenseUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)

    return expense


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(
    expense_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(expense)
