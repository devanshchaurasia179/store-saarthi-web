import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { formatPrice } from '../utils/formatters'

export default function CartButton() {
  const { totalItems, subtotal } = useCart()

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto"
        >
          <Link
            to="/cart"
            className="flex items-center justify-between bg-primary text-white rounded-2xl px-5 py-4 shadow-xl shadow-primary/30 hover:bg-primary-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-primary text-[9px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </p>
                <p className="text-xs text-white/70">{formatPrice(subtotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              View Cart
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
