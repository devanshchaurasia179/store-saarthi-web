import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ClipboardList, Clock, History } from 'lucide-react'
import { orderService } from '../services/orderService'
import OrderCard from '../components/OrderCard'
import { Skeleton } from '../components/Skeleton'

export default function OrdersPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('current')

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () =>
      orderService.getOrders({ page: 1, limit: 100, status: '' }).then((res) => res.data),
  })

  const orders = data?.orders || []

  // Split orders into current (last 24h) and past (older than 24h)
  const { currentOrders, pastOrders } = useMemo(() => {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const current = []
    const past = []

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt)
      if (orderDate >= twentyFourHoursAgo) {
        current.push(order)
      } else {
        past.push(order)
      }
    })

    return { currentOrders: current, pastOrders: past }
  }, [orders])

  const displayedOrders = activeTab === 'current' ? currentOrders : pastOrders

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-4 min-h-screen"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track and manage your orders</p>
        </div>
      </div>

      {/* Tabs: Current / Past */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'current'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Current Orders
          {currentOrders.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'current' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {currentOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'past'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <History className="w-4 h-4" />
          Past Orders
          {pastOrders.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'past' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {pastOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displayedOrders.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
            <ClipboardList className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-subheading font-semibold text-gray-700 mb-1">
            {activeTab === 'current' ? 'No current orders' : 'No past orders'}
          </h3>
          <p className="text-sm text-gray-400 max-w-xs">
            {activeTab === 'current'
              ? 'Orders placed in the last 24 hours will appear here.'
              : 'Orders older than 24 hours will appear here.'}
          </p>
        </motion.div>
      )}

      {/* Orders list */}
      {!isLoading && displayedOrders.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayedOrders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
