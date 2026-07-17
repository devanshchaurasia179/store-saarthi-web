import { Link } from 'react-router-dom'
import type { Bill } from '../../types/bill'

function fmt(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

type Props = {
  bills: Bill[]
  loading: boolean
}

export function RecentBillsSection({ bills, loading }: Props) {
  return (
    <section className="db-recent" aria-label="Recent bills">
      <div className="db-recent__head">
        <p className="db-recent__title">Recent Bills</p>
        <Link to="/bills" className="db-chart__link">See all →</Link>
      </div>

      {loading && <p className="db-panel__hint">Loading…</p>}

      {!loading && !bills.length && (
        <p className="db-panel__hint">No bills yet.</p>
      )}

      {!loading && bills.length > 0 && (
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
      )}
    </section>
  )
}
