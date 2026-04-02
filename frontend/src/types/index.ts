// Auth
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// User
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  language: string;
  currency: string;
  is_admin: boolean;
  created_at: string;
}

// Company
export interface Company {
  id: string;
  name: string;
  legal_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  logo_url: string | null;
  brand_colour: string | null;
  default_payment_terms_days: number | null;
  default_notes: string | null;
  invoice_prefix: string;
  next_invoice_number: number;
  use_year_in_number: boolean;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  bank_iban: string | null;
  bank_swift: string | null;
  created_at: string;
}

// Client
export interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  vat_number: string | null;
  invoice_prefix: string | null;
  next_invoice_number: number;
  use_year_in_number: boolean;
  default_payment_terms_days: number | null;
  default_notes: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  bank_iban: string | null;
  bank_swift: string | null;
  notes: string | null;
  total_receivables: number;
  created_at: string;
}

// Item (Services/Products catalog)
export interface Item {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit: string | null;
  is_active: boolean;
  created_at: string;
}

// Invoice
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type PaymentMethod = "bank_transfer" | "card" | "cash" | "other";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  unit: string | null;
  sort_order: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  reference: string | null;
  client_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  payment_method: PaymentMethod | null;
  payment_date: string | null;
  notes: string | null;
  terms: string | null;
  footer: string | null;
  sent_at: string | null;
  sent_to_email: string | null;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  client_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  created_at: string;
}

// Payments
export interface Payment {
  id: string;
  invoice_id: string | null;
  client_id: string | null;
  payment_number: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_mode: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

// Expenses
export type ExpenseType = "fixed" | "variable";

export interface ExpenseCategory {
  id: string;
  name: string;
  colour: string | null;
  icon: string | null;
}

export interface Expense {
  id: string;
  category_id: string | null;
  description: string;
  amount: number;
  currency: string;
  expense_type: ExpenseType;
  expense_date: string;
  vendor: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
}

// Dashboard
export interface DashboardStats {
  total_revenue: number;
  total_paid: number;
  total_unpaid: number;
  total_overdue: number;
  invoices_count: number;
  invoices_paid_count: number;
  invoices_unpaid_count: number;
  invoices_overdue_count: number;
  clients_count: number;
  total_expenses: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

export interface PeriodSummary {
  label: string;
  sales: number;
  receipts: number;
  due: number;
}

export interface DashboardData {
  stats: DashboardStats;
  monthly_trends: MonthlyTrend[];
  aging: AgingBucket[];
  period_summary: PeriodSummary[];
  currency: string;
}

// Donations
export interface DonationProgress {
  monthly_target: number;
  current_month_total: number;
  percentage: number;
  currency: string;
  message: string | null;
}

// Admin
export interface AdminMetrics {
  total_users: number;
  active_users: number;
  total_invoices: number;
  total_invoices_paid: number;
  total_revenue_processed: number;
  total_expenses_recorded: number;
  new_users_this_month: number;
}
