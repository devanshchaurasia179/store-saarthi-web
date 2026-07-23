import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'

// Lazy loaded pages
const ShopPage = lazy(() => import('./pages/ShopPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AddressPage = lazy(() => import('./pages/AddressPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            <Routes>
              <Route path="/" element={<Navigate to="/shop/demo" replace />} />
              <Route path="/shop/:shopId" element={<MainLayout />}>
                <Route index element={<ShopPage />} />
              </Route>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/address"
                element={<ProtectedRoute><AddressPage /></ProtectedRoute>}
              />
              <Route
                path="/checkout"
                element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>}
              />
              <Route
                path="/orders"
                element={<ProtectedRoute><OrdersPage /></ProtectedRoute>}
              />
              <Route
                path="/orders/:id"
                element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>}
              />
              <Route
                path="/order-success"
                element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>}
              />
              <Route
                path="/profile"
                element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
              />
            </Routes>
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
