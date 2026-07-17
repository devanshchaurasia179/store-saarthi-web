import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBills } from '../api/bills'
import { ApiError } from '../api/client'
import type { Bill } from '../types/bill'

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function RecentBillsCard() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetchBills()
        if (!cancelled) {
          // most recent first, limit to 5
          const sorted = [...res.bills].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          setBills(sorted.slice(0, 5))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load bills')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="dc-card">
      <div className="dc-card__head">
        <span className="dc-card__icon" aria-hidden>🧾</span>
        <span className="dc-card__title">Recent Bills</span>
        <Link to="/bills" className="dc-card__more">See more →</Link>
      </div>

      {loading && <p className="dc-card__hint">Loading…</p>}
      {error && <p className="dc-card__error">{error}</p>}

      {!loading && !error && bills.length === 0 && (
        <p className="dc-card__hint">No bills yet.</p>
      )}

      {!loading && bills.length > 0 && (
        <ul className="dc-bill-list">
          {bills.map((bill) => (
            <li key={bill._id}>
              <Link to={`/bills/${bill._id}`} className="dc-bill-row">
                <span className="dc-bill-row__icon" aria-hidden>📄</span>
                <span className="dc-bill-row__info">
                  <span className="dc-bill-row__num">Bill #{bill.dailyBillNumber}</span>
                  <span className="dc-bill-row__meta">
                    🕐 {formatTime(bill.createdAt)}
                    &nbsp;·&nbsp;
                    🛍 {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                  </span>
                </span>
                <span className="dc-bill-row__amount">{formatMoney(bill.totalAmount)}</span>
                <span className="dc-bill-row__chevron" aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
