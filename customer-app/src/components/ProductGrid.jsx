import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'
import { ProductGridSkeleton } from './Skeleton'
import LoadingSpinner from './LoadingSpinner'

export default function ProductGrid({
  products = [],
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  shopId,
  shopName,
  onProductClick,
}) {
  const observerRef = useRef(null)

  // Infinite scroll observer
  const lastProductRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage()
          }
        },
        { threshold: 0.5 }
      )

      if (node) observerRef.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  if (isLoading) {
    return <ProductGridSkeleton />
  }

  if (!products.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 px-4 text-center"
      >
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🔍</span>
        </div>
        <h3 className="font-subheading font-semibold text-gray-700 mb-1">
          No products found
        </h3>
        <p className="text-sm text-gray-400">
          Try a different search or category
        </p>
      </motion.div>
    )
  }

  return (
    <div className="px-4 pb-24">
      <div className="grid grid-cols-2 gap-3">
        {products.map((product, index) => {
          const isLast = index === products.length - 1
          return (
            <div key={product._id} ref={isLast ? lastProductRef : undefined}>
              <ProductCard
                product={product}
                shopId={shopId}
                shopName={shopName}
                onProductClick={onProductClick}
              />
            </div>
          )
        })}
      </div>

      {isFetchingNextPage && (
        <div className="py-6">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </div>
  )
}
