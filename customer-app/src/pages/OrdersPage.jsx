import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ClipboardList, Search } from 'lucide-react'
import { orderService } from '../services/orderService'
import OrderCard from '../components/OrderCard'
import { Skeleton } from '../components/Skeleton'
import LoadingSpinner from '../components/LoadingSpinner'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'out_for_delivery', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function OrdersPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, page],
    queryFn: () =>
      orderService.getOrders({ page, limit: 10, status: statusFilter }).then((res) => res.data),
    keepPreviousData: true,
  })

  const orders = data?.orders || []
  const pagination = data?.pagination || {}

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

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => { setStatusFilter(filter.value); setPage(1) }}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              statusFilter === filter.value
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
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
      {!isLoading && orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
            <ClipboardList className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-subheading font-semibold text-gray-700 mb-1">
            No orders yet
          </h3>
          <p className="text-sm text-gray-400 max-w-xs">
            {statusFilter
              ? `No ${statusFilter} orders found. Try a different filter.`
              : 'Your orders will appear here once you place one.'}
          </p>
        </motion.div>
      )}

      {/* Orders list */}
      {!isLoading && orders.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            {page} / {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  )
}
