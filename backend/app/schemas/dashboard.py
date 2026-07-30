from decimal import Decimal

from pydantic import BaseModel

from app.schemas.types import Money


class DashboardStats(BaseModel):
    total_revenue: Money
    total_paid: Money
    total_unpaid: Money
    total_overdue: Money
    invoices_count: int
    invoices_paid_count: int
    invoices_unpaid_count: int
    invoices_overdue_count: int
    clients_count: int
    total_expenses: Money


class AgingBucket(BaseModel):
    label: str
    amount: Money
    count: int


class PeriodSummary(BaseModel):
    label: str  # "Today", "This Week", etc.
    sales: Money
    receipts: Money
    due: Money


class MonthlyTrend(BaseModel):
    month: str  # "2026-01"
    revenue: Money
    expenses: Money


class DashboardResponse(BaseModel):
    stats: DashboardStats
    monthly_trends: list[MonthlyTrend]
    aging: list[AgingBucket]
    period_summary: list[PeriodSummary]
    currency: str
