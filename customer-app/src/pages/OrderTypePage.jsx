import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Truck, UtensilsCrossed } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useShopDetails } from '../hooks/useShop'

export default function OrderTypePage() {
  const navigate = useNavigate()
  const { items, shopId, shopName } = useCart()
  const { data: shopDetails } = useShopDetails(shopId)

  const [orderType, setOrderType] = useState(null) // 'delivery' | 'dineIn'
  const [tableNumber, setTableNumber] = useState('')
  const [error, setError] = useState('')

  const isDeliveryAvailable = shopDetails?.isDeliveryAvailable ?? true
  const isDineInAvailable = shopDetails?.isDineInAvailable ?? false

  // If only delivery is available (no dine-in), skip this page and go straight to checkout
  if (shopDetails && isDeliveryAvailable && !isDineInAvailable) {
    navigate('/checkout', { state: { orderType: 'delivery' }, replace: true })
    return null
  }

  // If cart is empty, redirect back
  if (items.length === 0) {
    navigate('/cart', { replace: true })
    return null
  }

  const handleContinue = () => {
    setError('')

    if (!orderType) {
      setError('Please select an order type')
      return
    }

    if (orderType === 'dineIn') {
      if (!tableNumber.trim()) {
        setError('Please enter your table number')
        return
      }
      // Navigate to checkout with dineIn info
      navigate('/checkout', {
        state: { orderType: 'dineIn', tableNumber: tableNumber.trim() },
      })
    } else {
      // Navigate to checkout with delivery type
      navigate('/checkout', { state: { orderType: 'delivery' } })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-4 pb-32"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">
            Order Type
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            How would you like to receive your order?
          </p>
        </div>
      </div>

      {/* Order Type Options */}
      <div className="space-y-4">
        {/* Delivery Option */}
        {isDeliveryAvailable && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { setOrderType('delivery'); setError('') }}
            className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
              orderType === 'delivery'
                ? 'border-primary bg-primary-50/40 shadow-md shadow-primary/10'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                orderType === 'delivery'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Truck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-subheading font-semibold text-gray-800 text-base">
                Delivery
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Get your order delivered to your address
              </p>
            </div>
            {orderType === 'delivery' && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </motion.button>
        )}

        {/* Dine In Option */}
        {isDineInAvailable && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { setOrderType('dineIn'); setError('') }}
            className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
              orderType === 'dineIn'
                ? 'border-primary bg-primary-50/40 shadow-md shadow-primary/10'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                orderType === 'dineIn'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-subheading font-semibold text-gray-800 text-base">
                Dine In
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Enjoy your food at the restaurant
              </p>
            </div>
            {orderType === 'dineIn' && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </motion.button>
        )}
      </div>

      {/* Table Number Input (shown when dineIn selected) */}
      {orderType === 'dineIn' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Table Number
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Enter your table number"
            className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary transition-colors"
            autoFocus
          />
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-500 mt-4 text-center"
        >
          {error}
        </motion.p>
      )}

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleContinue}
            disabled={!orderType}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            Continue
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
