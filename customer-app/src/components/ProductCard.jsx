import { memo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Package } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { formatPrice, calculateDiscount } from '../utils/formatters'
import QuantitySelector from './QuantitySelector'
import Badge from './Badge'

const ProductCard = memo(function ProductCard({ product, shopId, shopName, onProductClick }) {
  const { items, addItem, updateQuantity } = useCart()

  const cartItem = items.find((item) => item.id === product._id)
  const quantity = cartItem?.quantity || 0
  const displayPrice = typeof product.price === 'object' ? (product.price?.sellingPrice ?? 0) : (Number(product.price) || 0)
  const discount = calculateDiscount(product.originalPrice, displayPrice)
  const isOutOfStock = product.inStock === false

  const handleAdd = (e) => {
    e.stopPropagation()
    if (isOutOfStock) return
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

  const handleIncrease = (e) => {
    e.stopPropagation()
    updateQuantity(product._id, quantity + 1)
  }

  const handleDecrease = (e) => {
    e.stopPropagation()
    updateQuantity(product._id, quantity - 1)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onProductClick?.(product)}
      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 cursor-pointer transition-shadow hover:shadow-md relative overflow-hidden"
    >
      {/* Discount badge */}
      {discount > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="success">{discount}% OFF</Badge>
        </div>
      )}

      {/* Out of stock overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center rounded-2xl">
          <Badge variant="danger">Out of Stock</Badge>
        </div>
      )}

      {/* Product image */}
      <div className="relative w-full aspect-square rounded-xl bg-gray-50 mb-3 flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover rounded-xl"
            loading="lazy"
          />
        ) : (
          <Package className="w-10 h-10 text-gray-300" />
        )}
      </div>

      {/* Product info */}
      <div className="space-y-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide truncate">
          {product.category}
        </p>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight font-subheading">
          {product.name}
        </h3>
        {product.unit && (
          <p className="text-xs text-gray-400">{product.unit}</p>
        )}
      </div>

      {/* Price and action */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-gray-900">
            {formatPrice(displayPrice)}
          </span>
          {product.originalPrice && product.originalPrice > displayPrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Add / Quantity controls */}
        <div onClick={(e) => e.stopPropagation()}>
          {quantity > 0 ? (
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
              disabled={isOutOfStock}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary-light transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus className="w-4 h-4 text-white" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
})

export default ProductCard
