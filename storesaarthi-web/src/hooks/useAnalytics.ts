import { useCallback, useState } from 'react'
import {
  fetchDailyAnalytics,
  fetchWeeklyAnalytics,
  fetchMonthlyAnalytics,
  fetchYearlyAnalytics,
  fetchAnalyticsReport,
} from '../api/analytics'
import { ApiError } from '../api/client'
import type {
  AnalyticsRange,
  DailyAnalyticsResponse,
  WeeklyAnalyticsResponse,
  MonthlyAnalyticsResponse,
  YearlyAnalyticsResponse,
  AnalyticsReportResponse,
  ReportPeriod,
} from '../types/analytics'

type AnalyticsData =
  | DailyAnalyticsResponse
  | WeeklyAnalyticsResponse
  | MonthlyAnalyticsResponse
  | YearlyAnalyticsResponse
  | null

export type UseAnalyticsResult = {
  data: AnalyticsData
  report: AnalyticsReportResponse | null
  loading: boolean
  error: string
  reportLoading: boolean
  reportError: string
  load: (range: AnalyticsRange, date?: string) => Promise<void>
  loadReport: (period: ReportPeriod) => Promise<void>
}

export function useAnalytics(): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsData>(null)
  const [report, setReport] = useState<AnalyticsReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  const load = useCallback(async (range: AnalyticsRange, date?: string) => {
    setLoading(true)
    setError('')
    try {
      let result: AnalyticsData
      switch (range) {
        case 'daily':
          result = await fetchDailyAnalytics(date)
          break
        case 'weekly':
          result = await fetchWeeklyAnalytics(date)
          break
        case 'monthly':
          result = await fetchMonthlyAnalytics(date)
          break
        case 'yearly':
          result = await fetchYearlyAnalytics(date)
          break
        default:
          result = await fetchDailyAnalytics(date)
      }
      setData(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReport = useCallback(async (period: ReportPeriod) => {
    setReportLoading(true)
    setReportError('')
    try {
      const result = await fetchAnalyticsReport(period)
      setReport(result)
    } catch (err) {
      setReportError(err instanceof ApiError ? err.message : 'Failed to load report')
    } finally {
      setReportLoading(false)
    }
  }, [])

  return { data, report, loading, error, reportLoading, reportError, load, loadReport }
}
