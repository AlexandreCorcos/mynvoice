import csv
import io
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select, and_
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


@router.post("/convert-to-invoice-items")
async def convert_expenses_to_items(
    expense_ids: list[uuid.UUID],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(
            and_(
                Expense.id.in_(expense_ids),
                Expense.user_id == user.id,
                Expense.is_billable == True,
            )
        )
    )
    expenses = result.scalars().all()
    return [
        {
            "description": expense.description,
            "quantity": 1,
            "unit_price": expense.amount,
            "unit": None,
        }
        for expense in expenses
    ]


# --- CSV Import ---


def _normalise_headers(headers: list[str]) -> dict[str, str]:
    """Map lowercased/stripped CSV headers to canonical field names."""
    mapping: dict[str, str] = {}
    for h in headers:
        key = h.strip().lower().replace(" ", "_")
        mapping[key] = h
    return mapping


def _parse_date(value: str) -> date | None:
    """Try YYYY-MM-DD then DD/MM/YYYY."""
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except (ValueError, TypeError):
            continue
    return None


@router.post("/import-csv")
async def import_expenses_csv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import expenses from a CSV file.

    Expected columns (case-insensitive): description, amount, date,
    category, vendor, type (fixed/variable), notes.
    """
    content_bytes = await file.read()

    # Handle BOM: try utf-8-sig first, fall back to utf-8
    try:
        content = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        content = content_bytes.decode("utf-8")

    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no headers")

    header_map = _normalise_headers(reader.fieldnames)

    # Resolve canonical column names (find the original header for each field)
    def _col(canonical: str) -> str | None:
        return header_map.get(canonical)

    # Pre-fetch user's categories keyed by lowercase name
    cat_result = await db.execute(
        select(ExpenseCategory).where(ExpenseCategory.user_id == user.id)
    )
    categories_by_name: dict[str, ExpenseCategory] = {
        cat.name.lower(): cat for cat in cat_result.scalars().all()
    }

    imported = 0
    skipped = 0
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):  # row 1 is header
        # Helper to get a value by canonical key
        def _get(canonical: str) -> str:
            orig = _col(canonical)
            if orig is None:
                return ""
            return (row.get(orig) or "").strip()

        description = _get("description")
        amount_str = _get("amount")
        date_str = _get("date")

        # Validate required fields
        missing = []
        if not description:
            missing.append("description")
        if not amount_str:
            missing.append("amount")
        if not date_str:
            missing.append("date")
        if missing:
            errors.append(f"Row {row_num}: missing required field(s): {', '.join(missing)}")
            skipped += 1
            continue

        # Parse amount
        try:
            amount = Decimal(amount_str.replace(",", ""))
        except (InvalidOperation, ValueError):
            errors.append(f"Row {row_num}: invalid amount '{amount_str}'")
            skipped += 1
            continue

        # Parse date
        parsed_date = _parse_date(date_str)
        if parsed_date is None:
            errors.append(f"Row {row_num}: invalid date '{date_str}' (expected YYYY-MM-DD or DD/MM/YYYY)")
            skipped += 1
            continue

        # Category lookup (optional, case-insensitive)
        category_id = None
        category_name = _get("category")
        if category_name:
            cat = categories_by_name.get(category_name.lower())
            if cat:
                category_id = cat.id
            else:
                errors.append(f"Row {row_num}: category '{category_name}' not found, skipping category")

        # Expense type
        type_str = _get("type")
        expense_type = ExpenseType.FIXED if type_str.lower() == "fixed" else ExpenseType.VARIABLE

        # Optional fields
        vendor = _get("vendor") or None
        notes = _get("notes") or None

        expense = Expense(
            user_id=user.id,
            description=description,
            amount=amount,
            currency=user.currency,
            expense_type=expense_type,
            expense_date=parsed_date,
            category_id=category_id,
            vendor=vendor,
            notes=notes,
        )
        db.add(expense)
        imported += 1

    await db.flush()

    return {"imported": imported, "skipped": skipped, "errors": errors}
