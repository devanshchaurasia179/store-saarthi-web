import { useCallback, useEffect, useRef, useState } from 'react'
import { setAnalyticsPin, verifyAnalyticsPin } from '../api/analytics'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useAnalytics } from '../hooks/useAnalytics'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import type {
  AnalyticsProduct,
  AnalyticsRange,
  AnalyticsReportResponse,
  AnalyticsSummary,
  DailyAnalyticsResponse,
  MonthlyAnalyticsResponse,
  ReportPeriod,
  ReportRow,
  WeeklyAnalyticsResponse,
  YearlyAnalyticsResponse,
} from '../types/analytics'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
  yearly: 'This year',
}

const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  last_quarter: 'Last 3 months',
  last_6_months: 'Last 6 months',
  last_year: 'Last year',
}

// ─── PIN gate ────────────────────────────────────────────────────────────────

type PinGateProps = {
  hasPin: boolean
  onUnlocked: () => void
}

function PinGate({ hasPin, onUnlocked }: PinGateProps) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (hasPin) {
        await verifyAnalyticsPin(pin)
      } else {
        await setAnalyticsPin(pin)
      }
      onUnlocked()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Incorrect PIN')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="an-pin-wrap">
      <div className="an-pin-card">
        <div className="an-pin-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2>{hasPin ? 'Enter Analytics PIN' : 'Set up Analytics PIN'}</h2>
        <p className="an-pin-sub">
          {hasPin
            ? 'Analytics are protected. Enter your PIN to continue.'
            : 'Create a 4-digit PIN to protect your analytics data.'}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="an-pin-form">
          <input
            ref={inputRef}
            className="an-pin-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            aria-label="Analytics PIN"
            required
          />
          {error && (
            <p className="auth-msg auth-msg--error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="an-pin-btn" disabled={busy || pin.length < 4}>
            {busy ? 'Verifying…' : hasPin ? 'Unlock Analytics' : 'Set PIN & Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── summary stat cards ───────────────────────────────────────────────────────

type SummaryCardsProps = { summary: AnalyticsSummary; range: AnalyticsRange }

function SummaryCards({ summary, range }: SummaryCardsProps) {
  const { totalSales, debtVsSales, paymentModes } = summary
  const cashPct =
    debtVsSales.totalCollected > 0
      ? Math.round(((paymentModes.CASH || 0) / debtVsSales.totalCollected) * 100)
      : 0
  const upiPct =
    debtVsSales.totalCollected > 0
      ? Math.round(((paymentModes.UPI || 0) / debtVsSales.totalCollected) * 100)
      : 0

  return (
    <div className="an-cards">
      <div className="an-card">
        <div className="an-card__icon an-card__icon--blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="an-card__content">
          <span className="an-card__label">Total Sales · {RANGE_LABELS[range]}</span>
          <span className="an-card__value">{fmt(totalSales)}</span>
        </div>
      </div>
      <div className="an-card">
        <div className="an-card__icon an-card__icon--green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="an-card__content">
          <span className="an-card__label">Collected</span>
          <span className="an-card__value an-card__value--green">{fmt(debtVsSales.totalCollected)}</span>
        </div>
      </div>
      <div className="an-card an-card--warn">
        <div className="an-card__icon an-card__icon--amber">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="an-card__content">
          <span className="an-card__label">Pending / Debt</span>
          <span className="an-card__value an-card__value--amber">{fmt(debtVsSales.totalDebt)}</span>
        </div>
      </div>
      <div className="an-card">
        <div className="an-card__icon an-card__icon--indigo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
        <div className="an-card__content">
          <span className="an-card__label">Payment Split</span>
          <span className="an-card__value an-card__value--sm">
            Cash {cashPct}% · UPI {upiPct}%
          </span>
          <div className="an-split-bar">
            <div className="an-split-bar__cash" style={{ width: `${cashPct}%` }} title={`Cash: ${fmt(paymentModes.CASH)}`} />
            <div className="an-split-bar__upi" style={{ width: `${upiPct}%` }} title={`UPI: ${fmt(paymentModes.UPI)}`} />
          </div>
          <span className="an-card__sub">
            Cash {fmt(paymentModes.CASH)} · UPI {fmt(paymentModes.UPI)}
            {paymentModes.OTHERS > 0 ? ` · Others ${fmt(paymentModes.OTHERS)}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── top products table ───────────────────────────────────────────────────────

function TopProducts({ products }: { products: AnalyticsProduct[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (products.length === 0) {
    return <p className="an-empty">No products sold in this period.</p>
  }

  return (
    <div className="an-section">
      <div className="an-section__header">
        <h2 className="an-section__title">Top Products</h2>
        <span className="an-section__badge">{products.length} items</span>
      </div>
      <ul className="an-product-list">
        {products.slice(0, 20).map((p) => {
          const isOpen = expanded === p.productId
          const multiVariant = p.variants.length > 1
          return (
            <li key={p.productId} className="an-product-row">
              <div className="an-product-row__main">
                <div className="an-product-row__rank">
                  {products.indexOf(p) + 1}
                </div>
                <div className="an-product-row__info">
                  <span className="an-product-row__name">{p.name}</span>
                  <span className="an-product-row__qty">
                    {p.totalQuantity} {p.variants[0]?.unit ?? 'unit'}
                    {p.variants.length > 1 ? ` · ${p.variants.length} variants` : ''}
                  </span>
                </div>
                <div className="an-product-row__right">
                  <span className="an-product-row__revenue">{fmt(p.totalRevenue)}</span>
                  {multiVariant && (
                    <button
                      type="button"
                      className="an-expand-btn"
                      onClick={() => setExpanded(isOpen ? null : p.productId)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Collapse' : 'Expand'} variants for ${p.name}`}
                    >
                      {isOpen ? '▲' : '▼'}
                    </button>
                  )}
                </div>
              </div>
              {isOpen && multiVariant && (
                <ul className="an-variant-list">
                  {p.variants.map((v, i) => (
                    <li key={v.variantId ?? i} className="an-variant-row">
                      <span className="an-variant-row__name">{v.name}</span>
                      <span className="an-variant-row__qty">
                        {v.quantity} {v.unit}
                      </span>
                      <span className="an-variant-row__rev">{fmt(v.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── trend / breakdown list ───────────────────────────────────────────────────

type TrendEntry = { label: string; totalSales: number; debtVsSales?: DebtVs }
type DebtVs = { totalCollected: number; totalDebt: number; totalSales: number }

function TrendList({ entries, label }: { entries: TrendEntry[]; label: string }) {
  if (entries.length === 0) return null
  const maxSales = Math.max(...entries.map((e) => e.totalSales), 1)

  return (
    <div className="an-section">
      <div className="an-section__header">
        <h2 className="an-section__title">Breakdown by {label}</h2>
      </div>
      <ul className="an-trend-list">
        {entries.map((e, i) => (
          <li key={i} className="an-trend-row">
            <div className="an-trend-row__top">
              <span className="an-trend-row__label">{e.label}</span>
              <span className="an-trend-row__value">{fmt(e.totalSales)}</span>
            </div>
            <div className="an-trend-row__bar-bg">
              <div
                className="an-trend-row__bar-fill"
                style={{ width: `${(e.totalSales / maxSales) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── report table ────────────────────────────────────────────────────────────

function ReportTable({ rows }: { rows: ReportRow[] }) {
  if (rows.length === 0) {
    return <p className="an-empty">No data for the selected period.</p>
  }
  return (
    <div className="an-report-scroll">
      <table className="an-report-table" role="table">
        <thead>
          <tr>
            <th>Date</th>
            <th className="an-report-table__num">Bills</th>
            <th className="an-report-table__num">Sales</th>
            <th className="an-report-table__num">Collected</th>
            <th className="an-report-table__num">Debt</th>
            <th className="an-report-table__num">Cash</th>
            <th className="an-report-table__num">UPI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={row.type === 'month_total' ? 'an-report-table__subtotal' : ''}
            >
              <td>{row.label}</td>
              <td className="an-report-table__num">{row.billCount}</td>
              <td className="an-report-table__num">{fmt(row.totalSales)}</td>
              <td className="an-report-table__num">{fmt(row.collected)}</td>
              <td className="an-report-table__num">{row.debt > 0 ? fmt(row.debt) : '—'}</td>
              <td className="an-report-table__num">{row.cash > 0 ? fmt(row.cash) : '—'}</td>
              <td className="an-report-table__num">{row.upi > 0 ? fmt(row.upi) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── hidden PDF print template ────────────────────────────────────────────────

type PrintReportProps = {
  report: AnalyticsReportResponse
  shopName: string
  periodLabel: string
}

function PrintReport({ report, shopName, periodLabel }: PrintReportProps) {
  const { grandTotal: gt, rows, from, to } = report
  return (
    <div className="an-print-report" aria-hidden="true">
      <div className="an-print-report__header">
        <h1>{shopName}</h1>
        <p className="an-print-report__subtitle">Sales Report — {periodLabel}</p>
        <p className="an-print-report__dates">
          {fmtDate(from)} to {fmtDate(to)}
        </p>
      </div>

      <div className="an-print-report__summary">
        <div className="an-print-report__summary-grid">
          <div>
            <span className="an-print-report__summary-label">Total Sales</span>
            <span className="an-print-report__summary-value">{fmt(gt.totalSales)}</span>
          </div>
          <div>
            <span className="an-print-report__summary-label">Collected</span>
            <span className="an-print-report__summary-value">{fmt(gt.collected)}</span>
          </div>
          <div>
            <span className="an-print-report__summary-label">Pending Debt</span>
            <span className="an-print-report__summary-value">{fmt(gt.debt)}</span>
          </div>
          <div>
            <span className="an-print-report__summary-label">Total Bills</span>
            <span className="an-print-report__summary-value">{gt.billCount}</span>
          </div>
          <div>
            <span className="an-print-report__summary-label">Cash</span>
            <span className="an-print-report__summary-value">{fmt(gt.cash)}</span>
          </div>
          <div>
            <span className="an-print-report__summary-label">UPI</span>
            <span className="an-print-report__summary-value">{fmt(gt.upi)}</span>
          </div>
        </div>
      </div>

      <table className="an-print-report__table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Bills</th>
            <th>Sales</th>
            <th>Collected</th>
            <th>Debt</th>
            <th>Cash</th>
            <th>UPI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={row.type === 'month_total' ? 'an-print-report__subtotal' : ''}
            >
              <td>{row.label}</td>
              <td>{row.billCount}</td>
              <td>{fmt(row.totalSales)}</td>
              <td>{fmt(row.collected)}</td>
              <td>{row.debt > 0 ? fmt(row.debt) : '—'}</td>
              <td>{row.cash > 0 ? fmt(row.cash) : '—'}</td>
              <td>{row.upi > 0 ? fmt(row.upi) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="an-print-report__footer">
        Generated by StoreSaarthi · {new Date().toLocaleString('en-IN')}
      </p>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { shop } = useAuth()
  const [unlocked, setUnlocked] = useState(false)
  const [range, setRange] = useState<AnalyticsRange>('daily')
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('last_month')
  const [activeTab, setActiveTab] = useState<'overview' | 'report'>('overview')
  const { data, report, loading, error, reportLoading, reportError, load, loadReport } =
    useAnalytics()

  // load data whenever range changes (after unlock)
  useEffect(() => {
    if (!unlocked) return
    void load(range, todayISO())
  }, [unlocked, range, load])

  // load report when tab/period changes
  useEffect(() => {
    if (!unlocked || activeTab !== 'report') return
    void loadReport(reportPeriod)
  }, [unlocked, activeTab, reportPeriod, loadReport])

  const handlePrintReport = useCallback(() => {
    window.print()
  }, [])

  if (!unlocked) {
    return (
      <DashboardLayout>
        <PinGate hasPin={!!shop?.hasAnalyticsPin} onUnlocked={() => setUnlocked(true)} />
      </DashboardLayout>
    )
  }

  // ─── derive breakdown entries ─────────────────────────────────────────────

  let trendEntries: TrendEntry[] = []
  let trendLabel = ''

  if (data) {
    if (range === 'weekly') {
      const d = data as WeeklyAnalyticsResponse
      trendEntries = (d.days ?? []).map((day) => ({
        label: fmtDate(day.date),
        totalSales: day.totalSales,
      }))
      trendLabel = 'day'
    } else if (range === 'monthly') {
      const d = data as MonthlyAnalyticsResponse
      trendEntries = (d.weeks ?? []).map((w) => ({
        label: `Week of ${fmtDate(w.weekStart)}`,
        totalSales: w.totalSales,
      }))
      trendLabel = 'week'
    } else if (range === 'yearly') {
      const d = data as YearlyAnalyticsResponse
      trendEntries = (d.months ?? []).map((m) => {
        const [y, mo] = m.month.split('-')
        const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric',
        })
        return { label, totalSales: m.totalSales }
      })
      trendLabel = 'month'
    }
  }

  const dailyData = data as DailyAnalyticsResponse | null

  return (
    <DashboardLayout>
      <main className="an-main">
        {/* Header */}
        <div className="an-header">
          <div className="an-header__left">
            <h1 className="an-header__title">Analytics</h1>
            <p className="an-header__subtitle">{shop?.shopName} · Performance insights</p>
          </div>
          <div className="an-header__actions">
            <button
              type="button"
              className="an-lock-btn"
              onClick={() => setUnlocked(false)}
              aria-label="Lock analytics"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Lock
            </button>
          </div>
        </div>

        {/* Top-level tabs */}
        <div className="an-tabs" role="tablist" aria-label="Analytics sections">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            className={`an-tab${activeTab === 'overview' ? ' an-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
            </svg>
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'report'}
            className={`an-tab${activeTab === 'report' ? ' an-tab--active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Report
          </button>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* Range pills */}
            <div className="an-range-pills" role="group" aria-label="Time range">
              {(Object.keys(RANGE_LABELS) as AnalyticsRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`an-pill${range === r ? ' an-pill--active' : ''}`}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>

            {/* Date context for daily */}
            {range === 'daily' && dailyData?.date && (
              <p className="an-date-label">{fmtDate(dailyData.date)}</p>
            )}

            {loading && (
              <div className="an-loading">
                <div className="an-loading__spinner" />
                <span>Loading analytics…</span>
              </div>
            )}
            {error && <p className="auth-msg auth-msg--error">{error}</p>}

            {!loading && !error && data && (
              <>
                <SummaryCards summary={data} range={range} />
                {trendEntries.length > 0 && (
                  <TrendList entries={trendEntries} label={trendLabel} />
                )}
                <TopProducts products={data.products} />
                {data.biggestBill && (
                  <div className="an-section">
                    <div className="an-section__header">
                      <h2 className="an-section__title">Biggest Bill</h2>
                    </div>
                    <div className="an-biggest-bill">
                      <div className="an-biggest-bill__icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </div>
                      <div className="an-biggest-bill__content">
                        <span className="an-biggest-bill__amount">
                          {fmt(Number((data.biggestBill as Record<string, unknown>).totalAmount ?? 0))}
                        </span>
                        <span className="an-biggest-bill__meta">
                          {(data.biggestBill as Record<string, unknown>).createdAt
                            ? fmtDate(String((data.biggestBill as Record<string, unknown>).createdAt))
                            : 'This period'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {!loading && !error && data && data.totalSales === 0 && (
              <div className="an-empty-state">
                <div className="an-empty-state__icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
                  </svg>
                </div>
                <h3>No data yet</h3>
                <p>No bills found for this period. Start billing to see insights here.</p>
              </div>
            )}
          </>
        )}

        {/* ── REPORT TAB ── */}
        {activeTab === 'report' && (
          <>
            <div className="an-report-controls">
              <div className="an-report-controls__select-wrap">
                <label className="an-report-controls__label" htmlFor="report-period">
                  Period
                </label>
                <select
                  id="report-period"
                  className="an-report-select"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)}
                >
                  {(Object.keys(REPORT_PERIOD_LABELS) as ReportPeriod[]).map((p) => (
                    <option key={p} value={p}>
                      {REPORT_PERIOD_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>

              {report && !reportLoading && (
                <button
                  type="button"
                  className="an-pdf-btn no-print"
                  onClick={handlePrintReport}
                  aria-label="Download report as PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>
              )}
            </div>

            {reportLoading && (
              <div className="an-loading">
                <div className="an-loading__spinner" />
                <span>Generating report…</span>
              </div>
            )}
            {reportError && <p className="auth-msg auth-msg--error">{reportError}</p>}

            {!reportLoading && !reportError && report && (
              <>
                {/* Grand total banner */}
                <div className="an-report-banner no-print">
                  <div className="an-report-banner__cell">
                    <div className="an-report-banner__icon an-report-banner__icon--blue">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </div>
                    <div>
                      <span className="an-report-banner__label">Total Sales</span>
                      <span className="an-report-banner__value">{fmt(report.grandTotal.totalSales)}</span>
                    </div>
                  </div>
                  <div className="an-report-banner__cell">
                    <div className="an-report-banner__icon an-report-banner__icon--green">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <span className="an-report-banner__label">Collected</span>
                      <span className="an-report-banner__value an-report-banner__value--green">{fmt(report.grandTotal.collected)}</span>
                    </div>
                  </div>
                  <div className="an-report-banner__cell">
                    <div className="an-report-banner__icon an-report-banner__icon--amber">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div>
                      <span className="an-report-banner__label">Debt</span>
                      <span className="an-report-banner__value an-report-banner__value--amber">{fmt(report.grandTotal.debt)}</span>
                    </div>
                  </div>
                  <div className="an-report-banner__cell">
                    <div className="an-report-banner__icon an-report-banner__icon--indigo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                      </svg>
                    </div>
                    <div>
                      <span className="an-report-banner__label">Bills</span>
                      <span className="an-report-banner__value">{report.grandTotal.billCount}</span>
                    </div>
                  </div>
                </div>

                <div className="an-report-meta no-print">
                  <span>{fmtDate(report.from)}</span>
                  <span className="an-report-meta__arrow">→</span>
                  <span>{fmtDate(report.to)}</span>
                </div>

                <ReportTable rows={report.rows} />

                {/* Hidden print-only PDF template */}
                <PrintReport
                  report={report}
                  shopName={shop?.shopName ?? 'My Store'}
                  periodLabel={REPORT_PERIOD_LABELS[reportPeriod]}
                />
              </>
            )}
          </>
        )}
      </main>
    </DashboardLayout>
  )
}
