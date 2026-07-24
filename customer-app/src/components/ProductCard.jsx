import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { formatPrice, calculateDiscount } from '../utils/formatters'
import QuantitySelector from './QuantitySelector'
import Badge from './Badge'

const ProductCard = memo(function ProductCard({ product, shopId, shopName, disabled = false }) {
  const { items, addItem, updateQuantity } = useCart()
  const [expanded, setExpanded] = useState(false)

  const cartItem = items.find((item) => item.id === product._id)
  const quantity = cartItem?.quantity || 0
  const displayPrice = typeof product.price === 'object' ? (product.price?.sellingPrice ?? 0) : (Number(product.price) || 0)
  const discount = calculateDiscount(product.originalPrice, displayPrice)
  const isOutOfStock = product.inStock === false
  const hasVariants = product.variants?.length > 0

  const handleAdd = (e) => {
    e.stopPropagation()
    if (isOutOfStock || disabled) return
    if (hasVariants) {
      setExpanded(!expanded)
      return
    }
    addItem(
      {
        id: product._id,
        name: product.name,
        price: displayPrice,
        originalPrice: product.originalPrice,
        unit: product.unit,
        category: product.category,
        image: product.image,
      },
      shopId,
      shopName
    )
  }

  const handleToggle = () => {
    if (hasVariants && !isOutOfStock) {
      setExpanded(!expanded)
    }
  }

  const handleAddVariant = (variant) => {
    if (disabled) return
    const variantPrice = typeof variant.price === 'object' ? (variant.price?.sellingPrice ?? 0) : (Number(variant.price) || 0)
    const variantId = `${product._id}_${variant._id}`
    addItem(
      {
        id: variantId,
        name: `${product.name} - ${variant.name}`,
        price: variantPrice,
        unit: product.unit,
        category: product.category,
        image: product.image,
      },
      shopId,
      shopName
    )
  }

  const handleIncrease = (e) => {
    e.stopPropagation()
    if (disabled) return
    updateQuantity(product._id, quantity + 1)
  }

  const handleDecrease = (e) => {
    e.stopPropagation()
    updateQuantity(product._id, quantity - 1)
  }



  return (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-sm ${isOutOfStock ? 'opacity-60' : ''}`}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={handleToggle}
      >
        {/* Product info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800 truncate font-subheading">
              {product.name}
            </h3>
            {discount > 0 && <Badge variant="success">{discount}%</Badge>}
            {isOutOfStock && <Badge variant="danger">Out</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {product.category && (
              <p className="text-xs text-gray-400 truncate">{product.category}</p>
            )}
            {product.unit && (
              <span className="text-xs text-gray-300">· {product.unit}</span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            {(!isOutOfStock || displayPrice > 0) && (
              <span className="text-sm font-bold text-gray-900">
                {formatPrice(displayPrice)}
              </span>
            )}
            {product.originalPrice && product.originalPrice > displayPrice && !isOutOfStock && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            {hasVariants && (
              <span className={`text-xs font-medium ml-1 flex items-center gap-0.5 ${isOutOfStock ? 'text-gray-400' : 'text-primary'}`}>
                {product.variants.length} options
                {!isOutOfStock && (expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </span>
            )}
          </div>
        </div>

        {/* Add / Quantity controls */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {isOutOfStock ? (
            <motion.button
              disabled
              className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center shadow-sm opacity-50 cursor-not-allowed"
              aria-label={`${product.name} is out of stock`}
            >
              {hasVariants ? (
                <ChevronDown className="w-4 h-4 text-white" />
              ) : (
                <Plus className="w-4 h-4 text-white" />
              )}
            </motion.button>
          ) : quantity > 0 && !disabled && !hasVariants ? (
            <QuantitySelector
              quantity={quantity}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              compact
            />
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleAdd}
              disabled={disabled}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary-light transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={hasVariants ? `Show variants for ${product.name}` : `Add ${product.name} to cart`}
            >
              {hasVariants ? (
                expanded ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-white" />
              ) : (
                <Plus className="w-4 h-4 text-white" />
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Variants dropdown */}
      <AnimatePresence>
        {expanded && hasVariants && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-gray-50 space-y-1.5">
              {product.variants.map((variant) => {
                const variantPrice = typeof variant.price === 'object' ? (variant.price?.sellingPrice ?? 0) : (Number(variant.price) || 0)
                const variantId = `${product._id}_${variant._id}`
                const variantCartItem = items.find((item) => item.id === variantId)
                const variantQty = variantCartItem?.quantity || 0
                const variantOutOfStock = variant.inStock === false

                return (
                  <div
                    key={variant._id}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 ${variantOutOfStock ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700 font-medium">{variant.name}</span>
                      <span className="text-sm font-bold text-gray-900 ml-2">
                        {formatPrice(variantPrice)}
                      </span>
                      {variantOutOfStock && (
                        <span className="text-xs text-red-500 ml-2">Out of stock</span>
                      )}
                    </div>
                    <div className="shrink-0">
                      {variantQty > 0 && !disabled ? (
                        <QuantitySelector
                          quantity={variantQty}
                          onIncrease={() => !disabled && updateQuantity(variantId, variantQty + 1)}
                          onDecrease={() => updateQuantity(variantId, variantQty - 1)}
                          compact
                        />
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddVariant(variant)}
                          disabled={variantOutOfStock || disabled}
                          className="w-7 h-7 rounded-md bg-primary flex items-center justify-center hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Add ${variant.name}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default ProductCard
