import { Link, useParams } from 'react-router-dom'
import { ShoppingCart, User, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '../contexts/CartContext'

export default function Navbar() {
  const { shopId } = useParams()
  const { totalItems } = useCart()

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/shop/${shopId}`}
            className="flex items-center gap-2"
            aria-label="Back to shop"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-heading font-bold text-sm">S</span>
            </div>
            <span className="font-heading text-lg font-semibold text-gray-800 tracking-tight">
              StoreSaarthi
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Profile"
          >
            <User className="w-5 h-5 text-gray-600" />
          </Link>

          <Link
            to="/cart"
            className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            {totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {totalItems > 99 ? '99+' : totalItems}
              </motion.span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
