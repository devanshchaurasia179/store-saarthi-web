import { motion } from 'framer-motion'

export function Skeleton({ className = '' }) {
  return (
    <motion.div
      className={`bg-gray-200 rounded-lg animate-pulse ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  )
}

export function ShopBannerSkeleton() {
  return (
    <div className="px-4 pt-4">
      <Skeleton className="w-full h-40 rounded-2xl" />
      <div className="flex items-center gap-3 mt-4">
        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-48 h-6" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>
    </div>
  )
}

export function CategoryChipsSkeleton() {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="w-20 h-8 rounded-full shrink-0" />
      ))}
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
      <Skeleton className="w-full aspect-square rounded-xl mb-3" />
      <Skeleton className="w-3/4 h-4 mb-2" />
      <Skeleton className="w-1/2 h-3 mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton className="w-16 h-5" />
        <Skeleton className="w-20 h-8 rounded-lg" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function SearchBarSkeleton() {
  return (
    <div className="px-4 py-2">
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  )
}
