from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class RevenueByPeriod(BaseModel):
    period: str
    invoiced: Decimal
    received: Decimal
    outstanding: Decimal


class RevenueByClient(BaseModel):
    client_id: UUID
    client_name: str
    invoiced: Decimal
    received: Decimal
    outstanding: Decimal


class ExpensesByCategory(BaseModel):
    category_id: UUID | None
    category_name: str
    total: Decimal
    count: int


class ReportSummary(BaseModel):
    total_invoiced: Decimal
    total_received: Decimal
    total_outstanding: Decimal
    total_expenses: Decimal
    net_profit: Decimal


class ReportsResponse(BaseModel):
    revenue_by_period: list[RevenueByPeriod]
    revenue_by_client: list[RevenueByClient]
    expenses_by_category: list[ExpensesByCategory]
    summary: ReportSummary
