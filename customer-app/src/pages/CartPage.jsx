import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Package,
  Tag,
  Truck,
  ChevronRight,
} from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import QuantitySelector from '../components/QuantitySelector'
import { formatPrice } from '../utils/formatters'
import { DELIVERY_CHARGE, FREE_DELIVERY_ABOVE } from '../utils/constants'

export default function CartPage() {
  const navigate = useNavigate()
  const { items, shopName, shopId, subtotal, totalItems, updateQuantity, removeItem, clearCart } =
    useCart()

  const deliveryCharge = useMemo(() => {
    if (subtotal >= FREE_DELIVERY_ABOVE) return 0
    return DELIVERY_CHARGE
  }, [subtotal])

  const grandTotal = subtotal + deliveryCharge

  // Empty cart state
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-4 py-8"
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
          <h1 className="font-heading text-2xl font-bold text-gray-900">
            Your Cart
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-5"
          >
            <ShoppingCart className="w-12 h-12 text-gray-300" />
          </motion.div>
          <h2 className="font-subheading text-lg font-semibold text-gray-700 mb-2">
            Your cart is empty
          </h2>
          <p className="text-sm text-gray-400 mb-8 max-w-xs">
            Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
          </p>
          <Link
            to={shopId ? `/shop/${shopId}` : '/'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-light transition-colors shadow-md shadow-primary/20"
          >
            <Package className="w-4 h-4" />
            Browse Products
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-4 pb-44"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">
              Your Cart
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalItems} {totalItems === 1 ? 'item' : 'items'} from {shopName}
            </p>
          </div>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-red-500 font-medium hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          aria-label="Clear cart"
        >
          Clear All
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Coupon placeholder */}
      <div className="mt-6">
        <button className="w-full flex items-center gap-3 p-4 bg-white border border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary-50/30 transition-all group">
          <Tag className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
          <span className="flex-1 text-left text-sm text-gray-500 group-hover:text-primary transition-colors">
            Apply coupon code
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
        </button>
      </div>

      {/* Bill details */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-subheading font-semibold text-gray-800 mb-4">
          Bill Details
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-800 font-medium">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Delivery charge
            </span>
            {deliveryCharge === 0 ? (
              <span className="text-green-600 font-medium">FREE</span>
            ) : (
              <span className="text-gray-800 font-medium">
                {formatPrice(deliveryCharge)}
              </span>
            )}
          </div>
          {deliveryCharge > 0 && (
            <p className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
              Add {formatPrice(FREE_DELIVERY_ABOVE - subtotal)} more for free delivery
            </p>
          )}
          <div className="pt-3 border-t border-gray-100 flex justify-between">
            <span className="text-base font-bold text-gray-900">Grand Total</span>
            <span className="text-base font-bold text-gray-900">
              {formatPrice(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900">{formatPrice(grandTotal)}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/checkout')}
              className="flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
            >
              Proceed to Checkout
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ================================
   Cart Item Component
================================ */
function CartItem({ item, onUpdateQuantity, onRemove }) {
  const itemPrice = typeof item.price === 'object' ? (item.price?.sellingPrice ?? 0) : (Number(item.price) || 0)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm"
    >
      {/* Product image */}
      <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <Package className="w-7 h-7 text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-800 truncate font-subheading">
          {item.name}
        </h4>
        {item.unit && (
          <p className="text-xs text-gray-400 mt-0.5">{item.unit}</p>
        )}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-sm font-bold text-gray-900">
            {formatPrice(itemPrice * item.quantity)}
          </span>
          {item.quantity > 1 && (
            <span className="text-xs text-gray-400">
              ({formatPrice(itemPrice)} × {item.quantity})
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={() => onRemove(item.id)}
          className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
        <QuantitySelector
          quantity={item.quantity}
          onIncrease={() => onUpdateQuantity(item.id, item.quantity + 1)}
          onDecrease={() => onUpdateQuantity(item.id, item.quantity - 1)}
          compact
        />
      </div>
    </motion.div>
  )
}
