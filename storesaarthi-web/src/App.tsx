import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { BillDetailPage } from './pages/BillDetailPage'
import { BillsPage } from './pages/BillsPage'
import { CreateBillPage } from './pages/CreateBillPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { LedgerPage } from './pages/LedgerPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { OnlineOrdersPage } from './pages/OnlineOrdersPage'
import { HelpPage } from './pages/HelpPage'
import { PrintAgentPage } from './pages/PrintAgentPage'
import { ProfilePage } from './pages/ProfilePage'
import './styles/print-agent.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/bills/new" element={<CreateBillPage />} />
            <Route path="/bills/:billId" element={<BillDetailPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/online-orders" element={<OnlineOrdersPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/print-agent" element={<PrintAgentPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
