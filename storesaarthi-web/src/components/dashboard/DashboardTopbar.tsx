import { Link } from 'react-router-dom'

function greet(name: string) {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name}`
  if (h < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

type Props = {
  ownerName: string
  shopName: string
}

export function DashboardTopbar({ ownerName, shopName }: Props) {
  return (
    <header className="db-topbar">
      <div className="db-topbar__greeting">
        <h1 className="db-topbar__title">{greet(ownerName)}</h1>
        <p className="db-topbar__sub">
          {shopName} · Manage bills, inventory and sales
        </p>
      </div>
      <div className="db-topbar__right">
        <Link to="/bills/new" className="db-topbar__cta">
          ✚ New Bill
        </Link>
      </div>
    </header>
  )
}
