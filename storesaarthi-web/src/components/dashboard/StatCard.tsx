export type StatCardProps = {
  label: string
  value: string
  delta?: string
  positive?: boolean
  icon: string
  iconBg: string
}

export function StatCard({ label, value, delta, positive, icon, iconBg }: StatCardProps) {
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
