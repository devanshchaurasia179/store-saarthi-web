import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllTimeAnalytics } from '../api/analytics'
import { ApiError } from '../api/client'
import type { AnalyticsProduct } from '../types/analytics'

const RANK_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
}

function rankLabel(n: number) {
  return RANK_LABELS[n] ?? String(n)
}

// Map rank → bar color (matches screenshot: 1st=orange, 2nd=gray, 3rd=orange, rest=brand)
const BAR_COLORS = ['#f97316', '#94a3b8', '#f97316', '#1e3a8a', '#1e3a8a']

export function TopSellingCard() {
  const [products, setProducts] = useState<AnalyticsProduct[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetchAllTimeAnalytics()
        if (!cancelled) {
          const sorted = [...res.products].sort(
            (a, b) => b.totalQuantity - a.totalQuantity,
          )
          const top5 = sorted.slice(0, 5)
          setProducts(top5)
          setTotal(top5[0]?.totalQuantity ?? 1)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load analytics')
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
        <span className="dc-card__icon dc-card__icon--trend" aria-hidden>📈</span>
        <span className="dc-card__title">
          Most Sold Products
          {products.length > 0 && (
            <span className="dc-card__badge">{products.length}</span>
          )}
        </span>
        <Link to="/analytics" className="dc-card__more">View analytics →</Link>
      </div>

      {loading && <p className="dc-card__hint">Loading…</p>}
      {error && <p className="dc-card__error">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="dc-card__hint">No sales data yet.</p>
      )}

      {!loading && products.length > 0 && (
        <ul className="dc-product-list">
          {products.map((product, i) => {
            const barWidth = total > 0 ? (product.totalQuantity / total) * 100 : 0
            const color = BAR_COLORS[i] ?? '#1e3a8a'
            const isTop3 = i < 3
            return (
              <li key={product.productId} className="dc-product-row">
                <span
                  className={`dc-product-row__rank ${isTop3 ? 'dc-product-row__rank--top' : ''}`}
                  style={isTop3 ? { color } : undefined}
                >
                  {rankLabel(i + 1)}
                </span>
                <span className="dc-product-row__info">
                  <span className="dc-product-row__name">{product.name}</span>
                  <span
                    className="dc-product-row__bar"
                    role="progressbar"
                    aria-valuenow={product.totalQuantity}
                    aria-valuemax={total}
                  >
                    <span
                      className="dc-product-row__fill"
                      style={{ width: `${barWidth}%`, background: color }}
                    />
                  </span>
                </span>
                <span className="dc-product-row__qty">
                  {product.totalQuantity}&nbsp;<span className="dc-product-row__sold">sold</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
