import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { fetchBills } from '../api/bills'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import type { Bill } from '../types/bill'

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Returns "2025-07-19" in local time for a given ISO string */
function toLocalDateKey(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Pretty-prints a date key like "2025-07-19" → "Saturday, 19 Jul 2025" */
function prettyDateKey(key: string) {
  return new Date(key + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Today's date key in local time */
function todayKey() {
  return toLocalDateKey(new Date().toISOString())
}

export function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDate, setFilterDate] = useState<string>('') // "YYYY-MM-DD" or ""

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetchBills()
        if (!cancelled) setBills(res.bills)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Failed to load bills',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Bills filtered by the selected date (or all if no filter)
  const filteredBills = useMemo(() => {
    if (!filterDate) return bills
    return bills.filter((b) => toLocalDateKey(b.createdAt) === filterDate)
  }, [bills, filterDate])

  // Group filtered bills by date key, newest date first
  const grouped = useMemo(() => {
    const map = new Map<string, Bill[]>()
    for (const bill of filteredBills) {
      const key = toLocalDateKey(bill.createdAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(bill)
    }
    // Sort groups newest-first
    return Array.from(map.entries()).sort(([a], [b]) => (a > b ? -1 : 1))
  }, [filteredBills])

  const today = todayKey()

  function groupLabel(key: string) {
    if (key === today) return 'Today'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = toLocalDateKey(yesterday.toISOString())
    if (key === yKey) return 'Yesterday'
    return prettyDateKey(key)
  }

  return (
    <DashboardLayout>
      <main className="bills-main">
        <div className="bills-header">
          <div>
            <h1>Bills</h1>
            <p className="dash__sub">All bills for your shop</p>
          </div>
          <div className="db-topbar__right">
            <Link to="/bills/new" className="db-topbar__cta">
              ✚ New Bill
            </Link>
          </div>
        </div>

        {/* Date filter bar */}
        {!loading && !error && bills.length > 0 && (
          <div className="bills-filter-bar">
            <label className="bills-filter-bar__label" htmlFor="bills-date-filter">
              Filter by date
            </label>
            <div className="bills-filter-bar__controls">
              <input
                id="bills-date-filter"
                type="date"
                className="bills-filter-bar__input"
                value={filterDate}
                max={today}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <button
                  className="bills-filter-bar__clear"
                  onClick={() => setFilterDate('')}
                  aria-label="Clear date filter"
                >
                  ✕ Clear
                </button>
              )}
            </div>
            {filterDate && filteredBills.length === 0 && (
              <p className="bills-filter-bar__hint">
                No bills on {prettyDateKey(filterDate)}.
              </p>
            )}
          </div>
        )}

        {loading && <p className="dash__hint">Loading bills…</p>}
        {error && <p className="auth-msg auth-msg--error">{error}</p>}

        {!loading && !error && bills.length === 0 && (
          <div className="bills-empty">
            <p>No bills yet.</p>
            <Link to="/bills/new" className="auth-btn">
              Create your first bill
            </Link>
          </div>
        )}

        {!loading && grouped.length > 0 && (
          <div className="bills-grouped">
            {grouped.map(([dateKey, dayBills]) => (
              <section key={dateKey} className="bills-day">
                <div className="bills-day__header">
                  <h2 className="bills-day__label">{groupLabel(dateKey)}</h2>
                  <span className="bills-day__meta">
                    {dayBills.length} bill{dayBills.length !== 1 ? 's' : ''} ·{' '}
                    {formatMoney(
                      dayBills.reduce((s, b) => s + b.totalAmount, 0),
                    )}
                  </span>
                </div>
                <ul className="bills-list">
                  {dayBills.map((bill) => (
                    <li key={bill._id}>
                      <Link to={`/bills/${bill._id}`} className="bills-row">
                        <div>
                          <p className="bills-row__title">
                            Bill #{bill.dailyBillNumber}
                          </p>
                          <p className="bills-row__meta">
                            {formatDate(bill.createdAt)}
                          </p>
                        </div>
                        <div className="bills-row__right">
                          <span
                            className={`bills-status bills-status--${bill.paymentStatus.toLowerCase()}`}
                          >
                            {bill.paymentStatus}
                          </span>
                          <p className="bills-row__amount">
                            {formatMoney(bill.totalAmount)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
