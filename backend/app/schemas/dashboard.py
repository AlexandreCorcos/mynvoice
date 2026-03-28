from decimal import Decimal

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_revenue: Decimal
    total_paid: Decimal
    total_unpaid: Decimal
    total_overdue: Decimal
    invoices_count: int
    invoices_paid_count: int
    invoices_unpaid_count: int
    invoices_overdue_count: int
    clients_count: int
    total_expenses: Decimal


class MonthlyTrend(BaseModel):
    month: str  # "2026-01"
    revenue: Decimal
    expenses: Decimal


class DashboardResponse(BaseModel):
    stats: DashboardStats
    monthly_trends: list[MonthlyTrend]
