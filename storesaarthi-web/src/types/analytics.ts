// ─── Core shapes returned by analytics endpoints ─────────────────────────────

export type AnalyticsVariant = {
  variantId: string | null
  name: string
  unit: string
  quantity: number
  revenue: number
}

export type AnalyticsProduct = {
  productId: string
  name: string
  totalQuantity: number
  totalRevenue: number
  variants: AnalyticsVariant[]
}

export type PaymentModeStats = {
  CASH: number
  UPI: number
  OTHERS: number
}

export type DebtVsSales = {
  totalDebt: number
  totalSales: number
  totalCollected: number
}

export type AnalyticsSummary = {
  totalSales: number
  biggestBill: Record<string, unknown> | null
  products: AnalyticsProduct[]
  paymentModes: PaymentModeStats
  debtVsSales: DebtVsSales
}

// ─── Endpoint-specific response shapes ───────────────────────────────────────

export type DailyAnalyticsResponse = AnalyticsSummary & {
  success: boolean
  date: string // YYYY-MM-DD
}

export type WeeklyDayEntry = AnalyticsSummary & { date: string }

export type WeeklyAnalyticsResponse = AnalyticsSummary & {
  success: boolean
  days: WeeklyDayEntry[]
}

export type MonthlyWeekEntry = AnalyticsSummary & { weekStart: string }

export type MonthlyAnalyticsResponse = AnalyticsSummary & {
  success: boolean
  weeks: MonthlyWeekEntry[]
}

export type YearlyMonthEntry = AnalyticsSummary & { month: string } // YYYY-MM

export type YearlyAnalyticsResponse = AnalyticsSummary & {
  success: boolean
  months: YearlyMonthEntry[]
}

export type AllTimeAnalyticsResponse = AnalyticsSummary & {
  success: boolean
}

// ─── Report ───────────────────────────────────────────────────────────────────

export type ReportPeriod =
  | 'this_month'
  | 'last_month'
  | 'last_quarter'
  | 'last_6_months'
  | 'last_year'

export type ReportRow = {
  type: 'day' | 'month_total'
  date: string
  label: string
  totalSales: number
  collected: number
  debt: number
  billCount: number
  cash: number
  upi: number
  others: number
}

export type ReportGrandTotal = {
  totalSales: number
  collected: number
  debt: number
  billCount: number
  cash: number
  upi: number
  others: number
}

export type AnalyticsReportResponse = {
  success: boolean
  shopName: string
  period: ReportPeriod
  from: string
  to: string
  grandTotal: ReportGrandTotal
  rows: ReportRow[]
}

// ─── Time-range tabs ──────────────────────────────────────────────────────────

export type AnalyticsRange = 'daily' | 'weekly' | 'monthly' | 'yearly'
