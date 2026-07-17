import { useEffect, useState } from 'react'
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

export function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

        {!loading && bills.length > 0 && (
          <ul className="bills-list">
            {bills.map((bill) => (
              <li key={bill._id}>
                <Link to={`/bills/${bill._id}`} className="bills-row">
                  <div>
                    <p className="bills-row__title">
                      Bill #{bill.dailyBillNumber}
                    </p>
                    <p className="bills-row__meta">{formatDate(bill.createdAt)}</p>
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
        )}
      </main>
    </DashboardLayout>
  )
}
