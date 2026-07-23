import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Package, ArrowRight, ShoppingBag } from 'lucide-react'

export default function OrderSuccessPage() {
  const location = useLocation()
  const { orderId } = location.state || {}

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
        <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
          >
            <CheckCircle className="w-16 h-16 text-green-500" />
          </motion.div>
        </div>
        {/* Confetti dots */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: [0, 1, 0] }}
            transition={{ delay: 0.5 + i * 0.08, duration: 1.2 }}
            className="absolute w-2 h-2 rounded-full bg-primary"
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
          Order Placed!
        </h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          Your order has been placed successfully. The shop will confirm it shortly.
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
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
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
            <span className="font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-xs">
              Pending Confirmation
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Estimated Delivery</span>
            <span className="font-medium text-gray-800">25-40 min</span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="w-full mt-8 space-y-3"
      >
        {orderId && (
          <Link
            to={`/orders/${orderId}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
          >
            Track Order
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          Continue Shopping
        </Link>
      </motion.div>
    </motion.div>
  )
}
