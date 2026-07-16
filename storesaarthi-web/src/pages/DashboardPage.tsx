import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { shop, logout, secretKeyOnce, clearSecretKeyOnce } = useAuth()

  return (
    <div className="dash">
      <header className="dash__bar">
        <p className="dash__brand">StoreSaarthi</p>
        <button type="button" className="auth-link" onClick={() => void logout()}>
          Log out
        </button>
      </header>

      <main className="dash__main">
        <h1>Welcome, {shop?.ownerName}</h1>
        <p className="dash__sub">
          {shop?.shopName} · {shop?.mobileNumber}
        </p>

        {secretKeyOnce && (
          <div className="dash__secret" role="status">
            <p className="dash__secret-title">Save your secret key</p>
            <p className="dash__secret-body">
              This is shown only once. Use it to sign in on other devices.
            </p>
            <code>{secretKeyOnce}</code>
            <button type="button" className="auth-btn" onClick={clearSecretKeyOnce}>
              I’ve saved it
            </button>
          </div>
        )}

        <div className="dash__nav">
          <Link to="/bills" className="dash__nav-card">
            <span className="dash__nav-title">Bills</span>
            <span className="dash__nav-sub">View all bills and create new ones</span>
          </Link>
          <Link to="/bills/new" className="dash__nav-card dash__nav-card--accent">
            <span className="dash__nav-title">New bill</span>
            <span className="dash__nav-sub">Add products by name and save</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
