import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DashboardSidebar } from './DashboardSidebar'

type Props = {
  children: React.ReactNode
}

export function DashboardLayout({ children }: Props) {
  const { logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="db-shell">
      <DashboardSidebar active={pathname} onLogout={() => void logout()} />
      <div className="db-body">{children}</div>
    </div>
  )
}
