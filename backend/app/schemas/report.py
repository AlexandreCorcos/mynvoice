from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.types import Money


class RevenueByPeriod(BaseModel):
    period: str
    invoiced: Money
    received: Money
    outstanding: Money


class RevenueByClient(BaseModel):
    client_id: UUID
    client_name: str
    invoiced: Money
    received: Money
    outstanding: Money


class ExpensesByCategory(BaseModel):
    category_id: UUID | None
    category_name: str
    total: Money
    count: int


class ReportSummary(BaseModel):
    total_invoiced: Money
    total_received: Money
    total_outstanding: Money
    total_expenses: Money
    net_profit: Money


class ReportsResponse(BaseModel):
    revenue_by_period: list[RevenueByPeriod]
    revenue_by_client: list[RevenueByClient]
    expenses_by_category: list[ExpensesByCategory]
    summary: ReportSummary
