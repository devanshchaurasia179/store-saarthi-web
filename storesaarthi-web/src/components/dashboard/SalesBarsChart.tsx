import { Link } from 'react-router-dom'
import type { WeeklyDayEntry } from '../../types/analytics'

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

function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' })
}

type BarsProps = {
  days: WeeklyDayEntry[]
  loading: boolean
}

function SalesBars({ days, loading }: BarsProps) {
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

type Props = {
  days: WeeklyDayEntry[]
  loading: boolean
  weekTotal: number
}

export function SalesBarsChart({ days, loading, weekTotal }: Props) {
  return (
    <section className="db-chart" aria-label="Weekly sales trend">
      <div className="db-chart__head">
        <div>
          <p className="db-chart__title">Weekly Sales</p>
          <p className="db-chart__total">{loading ? '…' : fmt(weekTotal)}</p>
        </div>
        <Link to="/analytics" className="db-chart__link">
          Full report →
        </Link>
      </div>
      <SalesBars days={days} loading={loading} />
    </section>
  )
}
