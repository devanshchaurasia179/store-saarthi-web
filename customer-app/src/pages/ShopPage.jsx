import { useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useShopDetails, useShopCategories, useShopProducts } from '../hooks/useShop'
import ShopBanner from '../components/ShopBanner'
import SearchBar from '../components/SearchBar'
import CategoryChips from '../components/CategoryChips'
import ProductGrid from '../components/ProductGrid'
import CartButton from '../components/CartButton'
import ProductDetailsSheet from '../components/ProductDetailsSheet'
import {
  ShopBannerSkeleton,
  SearchBarSkeleton,
  CategoryChipsSkeleton,
} from '../components/Skeleton'

export default function ShopPage() {
  const { shopId } = useParams()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)

  const { data: shop, isLoading: shopLoading, error: shopError } = useShopDetails(shopId)
  const { data: categories, isLoading: categoriesLoading } = useShopCategories(shopId)
  const {
    data: productsData,
    isLoading: productsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useShopProducts(shopId, { category: selectedCategory, search: searchQuery })

  // Flatten paginated products
  const products = useMemo(() => {
    if (!productsData?.pages) return []
    return productsData.pages.flatMap((page) => page.products)
  }, [productsData])

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    if (query) setSelectedCategory('')
  }, [])

  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category)
    setSearchQuery('')
  }, [])

  const handleProductClick = useCallback((product) => {
    setSelectedProduct(product)
  }, [])

  // Error state
  if (shopError) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center"
      >
        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">😕</span>
        </div>
        <h2 className="font-heading text-xl font-bold text-gray-800 mb-2">
          Shop Not Found
        </h2>
        <p className="text-sm text-gray-500 max-w-xs">
          This shop doesn't exist or the link may be invalid. Please scan the QR code again.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-4">
      {/* Shop Banner */}
      {shopLoading ? <ShopBannerSkeleton /> : shop && <ShopBanner shop={shop} />}

      {/* Search */}
      {shopLoading ? (
        <SearchBarSkeleton />
      ) : (
        <div className="mt-4">
          <SearchBar
            onSearch={handleSearch}
            placeholder={`Search in ${shop?.shopName || 'this shop'}...`}
          />
        </div>
      )}

      {/* Categories */}
      {categoriesLoading ? (
        <CategoryChipsSkeleton />
      ) : (
        categories &&
        categories.length > 0 && (
          <CategoryChips
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />
        )
      )}

      {/* Section title */}
      {!productsLoading && products.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-2"
        >
          <h2 className="font-heading text-lg font-bold text-gray-800">
            {searchQuery
              ? `Results for "${searchQuery}"`
              : selectedCategory
              ? selectedCategory
              : 'All Products'}
          </h2>
        </motion.div>
      )}

      {/* Product Grid */}
      <ProductGrid
        products={products}
        isLoading={productsLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        shopId={shopId}
        shopName={shop?.shopName || ''}
        onProductClick={handleProductClick}
      />

      {/* Sticky Cart Button */}
      <CartButton />

      {/* Product Details Bottom Sheet */}
      <ProductDetailsSheet
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        shopId={shopId}
        shopName={shop?.shopName || ''}
      />
    </div>
  )
}
