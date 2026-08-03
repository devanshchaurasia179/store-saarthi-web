import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Package, ArrowRight, ShoppingBag, UtensilsCrossed, Clock } from 'lucide-react'
import { useCart } from '../contexts/CartContext'

const STATUS_LABELS = {
  pending: { label: 'Pending Confirmation', color: 'text-amber-600 bg-amber-50' },
  accepted: { label: 'Accepted', color: 'text-blue-600 bg-blue-50' },
  rejected: { label: 'Rejected', color: 'text-red-600 bg-red-50' },
  packing: { label: 'Packing', color: 'text-indigo-600 bg-indigo-50' },
  ready: { label: 'Ready', color: 'text-cyan-600 bg-cyan-50' },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-600 bg-orange-50' },
  delivered: { label: 'Delivered', color: 'text-green-600 bg-green-50' },
  cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50' },
}

export default function OrderSuccessPage() {
  const location = useLocation()
  const { orderId, estimatedDeliveryTime, orderType, orderStatus } = location.state || {}
  const { shopId, shopName } = useCart()

  const isDineIn = orderType === 'dineIn'
  const statusKey = orderStatus || 'pending'
  const statusDisplay = STATUS_LABELS[statusKey] || { label: statusKey, color: 'text-amber-600 bg-amber-50' }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center"
    >
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative"
      >
        <div className={`w-28 h-28 ${isDineIn ? 'bg-amber-50' : 'bg-green-50'} rounded-full flex items-center justify-center`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
          >
            {isDineIn ? (
              <UtensilsCrossed className="w-16 h-16 text-amber-500" />
            ) : (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
          </motion.div>
        </div>
        {/* Confetti dots */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: [0, 1, 0] }}
            transition={{ delay: 0.5 + i * 0.08, duration: 1.2 }}
            className={`absolute w-2 h-2 rounded-full ${isDineIn ? 'bg-amber-400' : 'bg-primary'}`}
            style={{
              top: `${50 + 55 * Math.sin((i * 2 * Math.PI) / 8)}%`,
              left: `${50 + 55 * Math.cos((i * 2 * Math.PI) / 8)}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center mt-8"
      >
        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
          {isDineIn ? 'Preparing Your Order!' : 'Order Placed!'}
        </h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          {isDineIn
            ? 'Your order is being prepared. It will be served to your table shortly.'
            : 'Your order has been placed successfully. The shop will confirm it shortly.'}
        </p>
      </motion.div>

      {/* Order info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full mt-8 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 ${isDineIn ? 'bg-amber-50' : 'bg-primary-50'} rounded-xl flex items-center justify-center`}>
            {isDineIn ? (
              <Clock className="w-5 h-5 text-amber-600" />
            ) : (
              <Package className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">Order ID</p>
            <p className="text-sm font-semibold text-gray-800 font-mono">
              {orderId ? `#${orderId.slice(-8).toUpperCase()}` : '#--------'}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className={`font-medium px-2 py-0.5 rounded-md text-xs ${
              isDineIn
                ? 'text-amber-600 bg-amber-50'
                : statusDisplay.color
            }`}>
              {isDineIn ? 'Preparing' : statusDisplay.label}
            </span>
          </div>
          {isDineIn ? (
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span className="font-medium text-gray-800">Will be served soon</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-gray-500">Estimated Delivery</span>
              <span className="font-medium text-gray-800">{estimatedDeliveryTime || '25-40 min'}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="w-full mt-8 space-y-3"
      >
        {/* Track Order - only for delivery */}
        {!isDineIn && orderId && (
          <Link
            to={`/orders/${orderId}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
          >
            Track Order
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        <Link
          to={shopId ? `/shop/${shopId}` : '/'}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm transition-colors ${
            isDineIn
              ? 'bg-primary text-white font-semibold hover:bg-primary-light shadow-lg shadow-primary/20'
              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Continue Ordering{shopName ? ` with ${shopName}` : ''}
        </Link>
      </motion.div>
    </motion.div>
  )
}
