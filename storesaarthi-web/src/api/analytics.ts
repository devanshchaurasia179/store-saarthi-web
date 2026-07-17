import { apiFetch } from './client'
import type {
  DailyAnalyticsResponse,
  WeeklyAnalyticsResponse,
  MonthlyAnalyticsResponse,
  YearlyAnalyticsResponse,
  AllTimeAnalyticsResponse,
  AnalyticsReportResponse,
  ReportPeriod,
} from '../types/analytics'

/** GET /api/analytics/daily?date=YYYY-MM-DD */
export function fetchDailyAnalytics(date?: string) {
  const q = date ? `?date=${date}` : ''
  return apiFetch<DailyAnalyticsResponse>(`/api/analytics/daily${q}`)
}

/** GET /api/analytics/weekly?date=YYYY-MM-DD */
export function fetchWeeklyAnalytics(date?: string) {
  const q = date ? `?date=${date}` : ''
  return apiFetch<WeeklyAnalyticsResponse>(`/api/analytics/weekly${q}`)
}

/** GET /api/analytics/monthly?date=YYYY-MM-DD */
export function fetchMonthlyAnalytics(date?: string) {
  const q = date ? `?date=${date}` : ''
  return apiFetch<MonthlyAnalyticsResponse>(`/api/analytics/monthly${q}`)
}

/** GET /api/analytics/yearly?date=YYYY-MM-DD */
export function fetchYearlyAnalytics(date?: string) {
  const q = date ? `?date=${date}` : ''
  return apiFetch<YearlyAnalyticsResponse>(`/api/analytics/yearly${q}`)
}

/** GET /api/analytics/all-time */
export function fetchAllTimeAnalytics() {
  return apiFetch<AllTimeAnalyticsResponse>(`/api/analytics/all-time`)
}

/** GET /api/analytics/report?period=... */
export function fetchAnalyticsReport(period: ReportPeriod) {
  return apiFetch<AnalyticsReportResponse>(`/api/analytics/report?period=${period}`)
}

// ─── Analytics PIN auth ───────────────────────────────────────────────────────

export function verifyAnalyticsPin(pin: string) {
  return apiFetch<{ success: boolean; message?: string }>('/api/auth/verify-analytics-pin', {
    method: 'POST',
    body: JSON.stringify({ analyticsPin: pin }),
  })
}

export function setAnalyticsPin(pin: string) {
  return apiFetch<{ success: boolean; message?: string }>('/api/auth/set-analytics-pin', {
    method: 'POST',
    body: JSON.stringify({ analyticsPin: pin }),
  })
}
