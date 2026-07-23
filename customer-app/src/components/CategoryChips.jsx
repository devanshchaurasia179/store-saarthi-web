import { useRef } from 'react'
import { motion } from 'framer-motion'

export default function CategoryChips({ categories = [], selected, onSelect }) {
  const scrollRef = useRef(null)

  const allCategories = ['All', ...categories]

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar"
      role="tablist"
      aria-label="Product categories"
    >
      {allCategories.map((cat) => {
        const isActive = cat === 'All' ? !selected : selected === cat
        return (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(cat === 'All' ? '' : cat)}
            className={`relative shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'text-white'
                : 'text-gray-600 bg-white border border-gray-200 hover:border-gray-300'
            }`}
            role="tab"
            aria-selected={isActive}
          >
            {isActive && (
              <motion.div
                layoutId="activeCategoryChip"
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{cat}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
