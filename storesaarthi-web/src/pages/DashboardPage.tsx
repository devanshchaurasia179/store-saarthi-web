import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDailyAnalytics, fetchWeeklyAnalytics } from '../api/analytics'
import { fetchBills } from '../api/bills'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import type { Bill } from '../types/bill'
import type { DailyAnalyticsResponse, WeeklyDayEntry } from '../types/analytics'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function greet(name: string) {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name}`
  if (h < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' })
}

// ─── Stat card ────────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string
  value: string
  delta?: string
  positive?: boolean
  icon: string
  iconBg: string
}

function StatCard({ label, value, delta, positive, icon, iconBg }: StatCardProps) {
  return (
    <div className="db-stat">
      <div className="db-stat__top">
        <span className="db-stat__icon" style={{ background: iconBg }} aria-hidden>
          {icon}
        </span>
        <span className="db-stat__more" aria-hidden>···</span>
      </div>
      <p className="db-stat__label">{label}</p>
      <p className="db-stat__value">{value}</p>
      {delta && (
        <p className={`db-stat__delta${positive ? ' db-stat__delta--up' : ' db-stat__delta--down'}`}>
          {positive ? '↑' : '↓'} {delta}
        </p>
      )}
    </div>
  )
}

// ─── Bar chart (pure CSS) ─────────────────────────────────────────────────────

type BarChartProps = {
  days: WeeklyDayEntry[]
  loading: boolean
}

function SalesBars({ days, loading }: BarChartProps) {
  if (loading) {
    return (
      <div className="db-chart__bars">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="db-chart__col">
            <div className="db-chart__bar db-chart__bar--skeleton" style={{ height: `${30 + Math.random() * 40}%` }} />
            <span className="db-chart__x">···</span>
          </div>
        ))}
      </div>
    )
  }

  if (!days.length) return <p className="db-chart__empty">No data this week</p>

  const max = Math.max(...days.map((d) => d.totalSales), 1)
  const todayStr = todayISO()

  return (
    <div className="db-chart__bars" role="img" aria-label="Weekly sales bar chart">
      {days.map((d) => {
        const pct = Math.max((d.totalSales / max) * 100, d.totalSales > 0 ? 4 : 1)
        const isToday = d.date === todayStr
        return (
          <div key={d.date} className="db-chart__col">
            {isToday && d.totalSales > 0 && (
              <span className="db-chart__tooltip">{fmt(d.totalSales)}</span>
            )}
            <div
              className={`db-chart__bar${isToday ? ' db-chart__bar--active' : ''}`}
              style={{ height: `${pct}%` }}
              title={`${shortDay(d.date)}: ${fmt(d.totalSales)}`}
            />
            <span className="db-chart__x">{shortDay(d.date)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Recent bills list ────────────────────────────────────────────────────────

function RecentBills({ bills, loading }: { bills: Bill[]; loading: boolean }) {
  if (loading) return <p className="db-panel__hint">Loading…</p>
  if (!bills.length) return <p className="db-panel__hint">No bills yet.</p>
  return (
    <ul className="db-bill-list">
      {bills.map((b) => (
        <li key={b._id}>
          <Link to={`/bills/${b._id}`} className="db-bill-row">
            <span className="db-bill-row__icon" aria-hidden>📄</span>
            <span className="db-bill-row__info">
              <span className="db-bill-row__num">Bill #{b.dailyBillNumber}</span>
              <span className="db-bill-row__time">
                {new Date(b.createdAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </span>
            <span className="db-bill-row__amt">{fmt(b.totalAmount)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// ─── Quick actions panel ──────────────────────────────────────────────────────

function QuickPanel() {
  return (
    <aside className="db-panel">
      {/* quick actions */}
      <div className="db-panel__section">
        <p className="db-panel__heading">Quick actions</p>
        <div className="db-panel__actions">
          <Link to="/bills/new" className="db-panel__action db-panel__action--primary">
            <span aria-hidden>✚</span>
            <span>New Bill</span>
          </Link>
          <Link to="/inventory" className="db-panel__action">
            <span aria-hidden>📦</span>
            <span>Inventory</span>
          </Link>
          <Link to="/analytics" className="db-panel__action">
            <span aria-hidden>📊</span>
            <span>Analytics</span>
          </Link>
        </div>
      </div>

      {/* divider */}
      <div className="db-panel__divider" />

      {/* print agent download */}
      <div className="db-panel__section">
        <p className="db-panel__heading">Print Agent</p>
        <a
          href="/StoreSaarthiPrintAgentSetup.exe"
          download
          className="db-panel__download"
        >
          <span aria-hidden>↓</span> Download for Windows
        </a>
        <p className="db-panel__download-hint">
          Enables bill printing from this app
        </p>
      </div>
    </aside>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { shop, secretKeyOnce, clearSecretKeyOnce } = useAuth()

  const [daily, setDaily] = useState<DailyAnalyticsResponse | null>(null)
  const [weekDays, setWeekDays] = useState<WeeklyDayEntry[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingChart, setLoadingChart] = useState(true)
  const [loadingBills, setLoadingBills] = useState(true)

  useEffect(() => {
    let cancelled = false
    const today = todayISO()

    // daily stats
    fetchDailyAnalytics(today)
      .then((d) => { if (!cancelled) { setDaily(d); setLoadingStats(false) } })
      .catch(() => { if (!cancelled) setLoadingStats(false) })

    // weekly chart
    fetchWeeklyAnalytics(today)
      .then((d) => { if (!cancelled) { setWeekDays(d.days ?? []); setLoadingChart(false) } })
      .catch(() => { if (!cancelled) setLoadingChart(false) })

    // recent bills
    fetchBills()
      .then((r) => {
        if (!cancelled) {
          const sorted = [...r.bills].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          setBills(sorted.slice(0, 5))
          setLoadingBills(false)
        }
      })
      .catch((err) => {
        if (!cancelled && !(err instanceof ApiError)) setLoadingBills(false)
        if (!cancelled) setLoadingBills(false)
      })

    return () => { cancelled = true }
  }, [])

  const ownerName = shop?.ownerName?.split(' ')[0] ?? 'there'

  // weekly totals for chart header
  const weekTotal = weekDays.reduce((s, d) => s + d.totalSales, 0)

  return (
    <DashboardLayout>
      {/* ── Top bar ── */}
      <header className="db-topbar">
        <div className="db-topbar__greeting">
          <h1 className="db-topbar__title">{greet(ownerName)}</h1>
          <p className="db-topbar__sub">
            {shop?.shopName} · Manage bills, inventory and sales
          </p>
        </div>
        <div className="db-topbar__right">
          <Link to="/bills/new" className="db-topbar__cta">
            ✚ New Bill
          </Link>
        </div>
      </header>

        {/* ── Secret key banner ── */}
        {secretKeyOnce && (
          <div className="dash__secret" style={{ margin: '0 0 24px' }}>
            <p className="dash__secret-title">Save your secret key</p>
            <p className="dash__secret-body">
              This is shown only once. Use it to sign in on other devices.
            </p>
            <code>{secretKeyOnce}</code>
            <button type="button" className="auth-btn" onClick={clearSecretKeyOnce}>
              I've saved it
            </button>
          </div>
        )}

        {/* ── Content area ── */}
        <div className="db-content">
          {/* ── Left: stats + chart + bills ── */}
          <div className="db-main">
            {/* Stat cards */}
            <section className="db-stats" aria-label="Today's summary">
              <StatCard
                label="Today's Sales"
                value={loadingStats ? '…' : fmt(daily?.totalSales ?? 0)}
                icon="₹"
                iconBg="linear-gradient(135deg, #0f6b4c, #1a9268)"
                delta={daily?.debtVsSales.totalCollected
                  ? `${fmt(daily.debtVsSales.totalCollected)} collected`
                  : undefined}
                positive
              />
              <StatCard
                label="Collected"
                value={loadingStats ? '…' : fmt(daily?.debtVsSales.totalCollected ?? 0)}
                icon="✓"
                iconBg="linear-gradient(135deg, #1d4ed8, #3b82f6)"
                delta={daily && daily.debtVsSales.totalCollected > 0 && daily.totalSales > 0
                  ? `${Math.round((daily.debtVsSales.totalCollected / daily.totalSales) * 100)}% of sales`
                  : undefined}
                positive
              />
              <StatCard
                label="Pending Debt"
                value={loadingStats ? '…' : fmt(daily?.debtVsSales.totalDebt ?? 0)}
                icon="⚠"
                iconBg="linear-gradient(135deg, #c45c26, #ea8145)"
                delta={daily && daily.debtVsSales.totalDebt > 0 ? 'outstanding' : undefined}
                positive={false}
              />
              <StatCard
                label="Cash / UPI"
                value={loadingStats ? '…' : `${fmt(daily?.paymentModes.CASH ?? 0)} / ${fmt(daily?.paymentModes.UPI ?? 0)}`}
                icon="💳"
                iconBg="linear-gradient(135deg, #7c3aed, #a855f7)"
              />
            </section>

            {/* Sales trend chart */}
            <section className="db-chart" aria-label="Weekly sales trend">
              <div className="db-chart__head">
                <div>
                  <p className="db-chart__title">Weekly Sales</p>
                  <p className="db-chart__total">{loadingChart ? '…' : fmt(weekTotal)}</p>
                </div>
                <Link to="/analytics" className="db-chart__link">
                  Full report →
                </Link>
              </div>
              <SalesBars days={weekDays} loading={loadingChart} />
            </section>

            {/* Recent bills */}
            <section className="db-recent" aria-label="Recent bills">
              <div className="db-recent__head">
                <p className="db-recent__title">Recent Bills</p>
                <Link to="/bills" className="db-chart__link">See all →</Link>
              </div>
              <RecentBills bills={bills} loading={loadingBills} />
            </section>
          </div>

          {/* ── Right panel ── */}
          <QuickPanel />
        </div>
    </DashboardLayout>
  )
}
