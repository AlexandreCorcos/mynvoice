import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.company import Company
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate

router = APIRouter()


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.user_id == user.id)
    if search:
        query = query.where(
            Client.company_name.ilike(f"%{search}%")
            | Client.contact_person.ilike(f"%{search}%")
            | Client.email.ilike(f"%{search}%")
        )
    query = query.order_by(Client.company_name).offset(skip).limit(limit)
    result = await db.execute(query)
    clients = result.scalars().all()

    # Compute receivables per client
    if clients:
        client_ids = [c.id for c in clients]
        recv_result = await db.execute(
            select(
                Invoice.client_id,
                func.coalesce(func.sum(Invoice.total), 0).label("receivable"),
            )
            .where(
                Invoice.user_id == user.id,
                Invoice.client_id.in_(client_ids),
                Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE]),
            )
            .group_by(Invoice.client_id)
        )
        recv_map = {str(r.client_id): r.receivable for r in recv_result.all()}
    else:
        recv_map = {}

    # Build response with receivables
    responses = []
    for c in clients:
        resp = ClientResponse.model_validate(c)
        resp.total_receivables = recv_map.get(str(c.id), Decimal("0.00"))
        responses.append(resp)

    return responses


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.user_id == user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = Client(user_id=user.id, **data.model_dump())
    db.add(client)
    await db.flush()
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.user_id == user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.user_id == user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    await db.delete(client)


@router.get("/{client_id}/bank-defaults")
async def get_bank_defaults(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return company bank details as defaults to import into client."""
    result = await db.execute(
        select(Company).where(Company.user_id == user.id)
    )
    company = result.scalar_one_or_none()
    if not company:
        return {}
    return {
        "bank_name": company.bank_name,
        "bank_account_name": company.bank_account_name,
        "bank_account_number": company.bank_account_number,
        "bank_sort_code": company.bank_sort_code,
        "bank_iban": company.bank_iban,
        "bank_swift": company.bank_swift,
    }
