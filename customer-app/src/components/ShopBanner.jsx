import { motion } from 'framer-motion'
import { Store, Star, Clock, MapPin, Navigation } from 'lucide-react'
import Badge from './Badge'

export default function ShopBanner({ shop, distance }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pt-4"
    >
      {/* Banner image area */}
      <div className="relative w-full h-40 rounded-2xl bg-gradient-to-br from-primary/10 via-primary-50 to-primary/5 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iIzFFM0E4QSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="text-center relative z-10">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-2">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <p className="text-xs text-primary/60 font-medium">Welcome to</p>
        </div>
      </div>

      {/* Shop info */}
      <div className="flex items-start gap-3 mt-4">
        <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
          <span className="text-white font-heading font-bold text-xl">
            {shop.shopName?.charAt(0) || 'S'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-xl font-bold text-gray-900 truncate">
            {shop.shopName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {shop.storeCategory && (
              <span className="text-xs text-gray-500">{shop.storeCategory}</span>
            )}
            <Badge variant="success">Open</Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              4.5
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              15-25 min
            </span>
            {distance && (
              <span className="flex items-center gap-1 text-primary font-medium">
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                {distance}
              </span>
            )}
            {shop.address && (shop.address.street || shop.address.city) && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {[shop.address.street, shop.address.city].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
