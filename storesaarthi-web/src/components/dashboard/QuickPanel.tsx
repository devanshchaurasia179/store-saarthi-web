import { Link } from 'react-router-dom'

export function QuickPanel() {
  return (
    <aside className="db-panel">
      {/* Quick actions */}
      <div className="db-panel__section">
        <p className="db-panel__heading">Quick actions</p>
        <div className="db-panel__actions">
          <Link to="/bills/new" className="db-panel__action db-panel__action--primary">
            <span aria-hidden>✚</span>
            <span>New Bill</span>
          </Link>
          <Link to="/inventory" className="db-panel__action">
            <span aria-hidden>📦</span>
            <span>Inventory</span>
          </Link>
          <Link to="/analytics" className="db-panel__action">
            <span aria-hidden>📊</span>
            <span>Analytics</span>
          </Link>
        </div>
      </div>

      <div className="db-panel__divider" />

      {/* Print agent download */}
      <div className="db-panel__section">
        <p className="db-panel__heading">Print Agent</p>
        <a
          href="/StoreSaarthiPrintAgentSetup.exe"
          download
          className="db-panel__download"
        >
          <span aria-hidden>↓</span> Download for Windows
        </a>
        <p className="db-panel__download-hint">
          Enables bill printing from this app
        </p>
      </div>
    </aside>
  )
}
