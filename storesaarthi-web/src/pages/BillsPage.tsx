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
  const [searchQuery, setSearchQuery] = useState('')

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

  // Bills filtered by date and search
  const filteredBills = useMemo(() => {
    let result = bills

    if (filterDate) {
      result = result.filter((b) => toLocalDateKey(b.createdAt) === filterDate)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (b) =>
          String(b.dailyBillNumber).includes(q) ||
          b.paymentStatus.toLowerCase().includes(q) ||
          formatMoney(b.totalAmount).toLowerCase().includes(q),
      )
    }

    return result
  }, [bills, filterDate, searchQuery])

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

  // Summary stats
  const stats = useMemo(() => {
    const todayBills = bills.filter((b) => toLocalDateKey(b.createdAt) === today)
    const todayTotal = todayBills.reduce((s, b) => s + b.totalAmount, 0)
    const totalRevenue = bills.reduce((s, b) => s + b.totalAmount, 0)
    const paidCount = bills.filter((b) => b.paymentStatus.toLowerCase() === 'paid').length
    const unpaidCount = bills.filter((b) => b.paymentStatus.toLowerCase() === 'unpaid').length
    return { todayBills: todayBills.length, todayTotal, totalRevenue, paidCount, unpaidCount, total: bills.length }
  }, [bills, today])

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
      <main className="bills-page">
        {/* Header */}
        <div className="bills-page__header">
          <div className="bills-page__header-left">
            <h1 className="bills-page__title">Bills</h1>
            <p className="bills-page__subtitle">Track and manage all your shop bills</p>
          </div>
          <div className="bills-page__header-right">
            <Link to="/bills/new" className="bills-page__new-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Bill
            </Link>
          </div>
        </div>

        {/* Stats cards */}
        {!loading && !error && bills.length > 0 && (
          <div className="bills-page__stats">
            <div className="bills-page__stat">
              <div className="bills-page__stat-icon bills-page__stat-icon--blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="bills-page__stat-content">
                <span className="bills-page__stat-label">Today's Bills</span>
                <span className="bills-page__stat-value">{stats.todayBills}</span>
              </div>
            </div>
            <div className="bills-page__stat">
              <div className="bills-page__stat-icon bills-page__stat-icon--green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="bills-page__stat-content">
                <span className="bills-page__stat-label">Today's Revenue</span>
                <span className="bills-page__stat-value">{formatMoney(stats.todayTotal)}</span>
              </div>
            </div>
            <div className="bills-page__stat">
              <div className="bills-page__stat-icon bills-page__stat-icon--indigo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="bills-page__stat-content">
                <span className="bills-page__stat-label">Total Revenue</span>
                <span className="bills-page__stat-value">{formatMoney(stats.totalRevenue)}</span>
              </div>
            </div>
            <div className="bills-page__stat">
              <div className="bills-page__stat-icon bills-page__stat-icon--amber">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="bills-page__stat-content">
                <span className="bills-page__stat-label">Paid / Unpaid</span>
                <span className="bills-page__stat-value">
                  <span className="bills-page__stat-paid">{stats.paidCount}</span>
                  {' / '}
                  <span className="bills-page__stat-unpaid">{stats.unpaidCount}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search bar */}
        {!loading && !error && bills.length > 0 && (
          <div className="bills-page__toolbar">
            <div className="bills-page__search">
              <svg className="bills-page__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="bills-page__search-input"
                placeholder="Search bills by number, status, amount…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="bills-page__search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <div className="bills-page__filters">
              <div className="bills-page__date-filter">
                <input
                  id="bills-date-filter"
                  type="date"
                  className="bills-page__date-input"
                  value={filterDate}
                  max={today}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              {filterDate && (
                <button
                  className="bills-page__filter-clear"
                  onClick={() => setFilterDate('')}
                  aria-label="Clear date filter"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Clear
                </button>
              )}
              <span className="bills-page__result-count">
                {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bills-page__loading">
            <div className="bills-page__loading-spinner" />
            <p>Loading bills…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bills-page__error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && bills.length === 0 && (
          <div className="bills-page__empty">
            <div className="bills-page__empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h3>No bills yet</h3>
            <p>Create your first bill to get started tracking your sales</p>
            <Link to="/bills/new" className="bills-page__empty-cta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create your first bill
            </Link>
          </div>
        )}

        {/* No results for filter */}
        {!loading && !error && bills.length > 0 && filteredBills.length === 0 && (
          <div className="bills-page__no-results">
            <p>No bills match your filters</p>
            <button
              className="bills-page__no-results-btn"
              onClick={() => { setFilterDate(''); setSearchQuery('') }}
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Grouped bills list */}
        {!loading && grouped.length > 0 && (
          <div className="bills-page__groups">
            {grouped.map(([dateKey, dayBills]) => (
              <section key={dateKey} className="bills-page__day">
                <div className="bills-page__day-header">
                  <h2 className="bills-page__day-label">{groupLabel(dateKey)}</h2>
                  <div className="bills-page__day-summary">
                    <span className="bills-page__day-count">
                      {dayBills.length} bill{dayBills.length !== 1 ? 's' : ''}
                    </span>
                    <span className="bills-page__day-total">
                      {formatMoney(dayBills.reduce((s, b) => s + b.totalAmount, 0))}
                    </span>
                  </div>
                </div>
                <ul className="bills-page__list">
                  {dayBills.map((bill) => (
                    <li key={bill._id}>
                      <Link to={`/bills/${bill._id}`} className="bills-page__card">
                        <div className="bills-page__card-left">
                          <div className="bills-page__card-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div className="bills-page__card-info">
                            <p className="bills-page__card-title">
                              Bill #{bill.dailyBillNumber}
                            </p>
                            <p className="bills-page__card-time">
                              {formatDate(bill.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="bills-page__card-right">
                          <span
                            className={`bills-page__badge bills-page__badge--${bill.paymentStatus.toLowerCase()}`}
                          >
                            {bill.paymentStatus}
                          </span>
                          <p className="bills-page__card-amount">
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
