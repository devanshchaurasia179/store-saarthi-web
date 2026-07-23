import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Store, Package } from 'lucide-react'
import Badge from './Badge'
import { formatPrice } from '../utils/formatters'
import { ORDER_STATUS_LABELS } from '../utils/constants'

export default function OrderCard({ order }) {
  const statusVariant = getStatusVariant(order.status)
  const itemCount = order.items?.length || 0
  const firstItem = order.items?.[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to={`/orders/${order._id}`}
        className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        {/* Top row: Shop + Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
              <Store className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">
              {order.shop?.shopName || 'Shop'}
            </span>
          </div>
          <Badge variant={statusVariant}>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </Badge>
        </div>

        {/* Items preview */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 truncate">
              {firstItem?.productName || firstItem?.name || 'Items'}
              {itemCount > 1 && (
                <span className="text-gray-400"> +{itemCount - 1} more</span>
              )}
            </p>
          </div>
        </div>

        {/* Bottom row: Total + Date + Arrow */}
        <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(order.totalAmount)}
            </span>
            <span className="text-xs text-gray-400">
              {formatDate(order.createdAt)}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </Link>
    </motion.div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusVariant(status) {
  switch (status) {
    case 'pending': return 'warning'
    case 'accepted':
    case 'packing':
    case 'ready':
    case 'out_for_delivery': return 'primary'
    case 'delivered': return 'success'
    case 'cancelled': return 'danger'
    default: return 'default'
  }
}
