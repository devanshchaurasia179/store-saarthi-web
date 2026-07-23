import { Minus, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

export default function QuantitySelector({ quantity, onIncrease, onDecrease, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onDecrease}
          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Decrease quantity"
        >
          <Minus className="w-3.5 h-3.5 text-gray-600" />
        </motion.button>
        <span className="w-7 text-center text-sm font-semibold text-gray-800">
          {quantity}
        </span>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onIncrease}
          className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center hover:bg-primary-light transition-colors"
          aria-label="Increase quantity"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
        </motion.button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onDecrease}
        className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors"
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4 text-gray-600" />
      </motion.button>
      <span className="w-8 text-center text-base font-bold text-gray-800">
        {quantity}
      </span>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onIncrease}
        className="w-9 h-9 rounded-lg bg-primary shadow-sm flex items-center justify-center hover:bg-primary-light transition-colors"
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4 text-white" />
      </motion.button>
    </div>
  )
}
