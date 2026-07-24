import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, ShoppingCart, Check } from 'lucide-react'
import BottomSheet from './BottomSheet'
import QuantitySelector from './QuantitySelector'
import Badge from './Badge'
import { useCart } from '../contexts/CartContext'
import { formatPrice, calculateDiscount } from '../utils/formatters'

export default function ProductDetailsSheet({ product, isOpen, onClose, shopId, shopName }) {
  const { items, addItem, updateQuantity } = useCart()
  const [selectedVariant, setSelectedVariant] = useState(null)

  if (!product) return null

  const hasVariants = product.variants?.length > 0

  // Determine which item to show in cart (base product or selected variant)
  const activeId = selectedVariant ? `${product._id}_${selectedVariant._id}` : product._id
  const cartItem = items.find((item) => item.id === activeId)
  const quantity = cartItem?.quantity || 0

  const basePrice = typeof product.price === 'object' ? (product.price?.sellingPrice ?? 0) : (Number(product.price) || 0)
  const displayPrice = selectedVariant
    ? (typeof selectedVariant.price === 'object' ? (selectedVariant.price?.sellingPrice ?? 0) : (Number(selectedVariant.price) || 0))
    : basePrice
  const discount = calculateDiscount(product.originalPrice, displayPrice)
  const isOutOfStock = selectedVariant ? selectedVariant.inStock === false : product.inStock === false

  const handleAdd = () => {
    if (isOutOfStock) return
    const itemName = selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name
    addItem(
      {
        id: activeId,
        name: itemName,
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

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Product Details">
      <div className="px-5 py-4 space-y-5">
        {/* Image */}
        <div className="w-full aspect-[4/3] rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <Package className="w-16 h-16 text-gray-200" />
          )}
        </div>

        {/* Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                {product.category}
              </p>
              <h3 className="font-heading text-xl font-bold text-gray-900">
                {product.name}
              </h3>
            </div>
            {discount > 0 && (
              <Badge variant="success">{discount}% OFF</Badge>
            )}
          </div>

          {product.unit && (
            <p className="text-sm text-gray-500">{product.unit}</p>
          )}

          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(displayPrice)}
          </span>
          {product.originalPrice && product.originalPrice > displayPrice && (
            <span className="text-base text-gray-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Availability */}
        <div className="flex items-center gap-2">
          {isOutOfStock ? (
            <Badge variant="danger">Out of Stock</Badge>
          ) : (
            <Badge variant="success">
              <Check className="w-3 h-3 mr-1" />
              In Stock
            </Badge>
          )}
          {product.quantity != null && product.inStock && (
            <span className="text-xs text-gray-400">
              ({product.quantity} available)
            </span>
          )}
        </div>

        {/* Variants */}
        {hasVariants && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Select Variant</p>
            <div className="flex flex-wrap gap-2">
              {/* Base product option */}
              <button
                onClick={() => setSelectedVariant(null)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  !selectedVariant
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="block">{product.unit || 'Regular'}</span>
                <span className="block mt-0.5 font-bold">{formatPrice(basePrice)}</span>
              </button>
              {product.variants.map((variant) => {
                const variantPrice = typeof variant.price === 'object' ? (variant.price?.sellingPrice ?? 0) : (Number(variant.price) || 0)
                const isSelected = selectedVariant?._id === variant._id
                const variantOutOfStock = variant.inStock === false
                return (
                  <button
                    key={variant._id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variantOutOfStock}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-50 text-primary'
                        : variantOutOfStock
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="block">{variant.name}</span>
                    <span className="block mt-0.5 font-bold">{formatPrice(variantPrice)}</span>
                    {variantOutOfStock && <span className="block text-red-400 text-[10px]">Out of stock</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add to Cart Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4">
        {quantity > 0 ? (
          <div className="flex items-center justify-between">
            <QuantitySelector
              quantity={quantity}
              onIncrease={() => updateQuantity(activeId, quantity + 1)}
              onDecrease={() => updateQuantity(activeId, quantity - 1)}
            />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ShoppingCart className="w-4 h-4" />
              <span>{quantity} in cart</span>
            </div>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            disabled={isOutOfStock}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            <ShoppingCart className="w-5 h-5" />
            {hasVariants && selectedVariant ? `Add ${selectedVariant.name}` : 'Add to Cart'}
          </motion.button>
        )}
      </div>
    </BottomSheet>
  )
}
