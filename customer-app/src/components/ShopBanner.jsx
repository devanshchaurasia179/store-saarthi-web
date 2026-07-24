import { motion } from 'framer-motion'
import { Store, Star, Clock, MapPin, Navigation, Truck, IndianRupee } from 'lucide-react'
import Badge from './Badge'

/**
 * Determine if the store is currently open based on businessHours + isStoreOnline
 */
function getStoreOpenStatus(shop) {
  // If explicitly offline
  if (shop.isStoreOnline === false) return { open: false, label: 'Offline' }

  const hours = shop.businessHours
  if (!hours?.openTime || !hours?.closeTime) return { open: true, label: 'Open' }

  // Check if today is an off day
  const now = new Date()
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]
  if (hours.offDays?.includes(dayName)) return { open: false, label: 'Closed Today' }

  // Check time
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [openH, openM] = hours.openTime.split(':').map(Number)
  const [closeH, closeM] = hours.closeTime.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  let closeMinutes = closeH * 60 + closeM

  // Handle midnight (00:00) or overnight hours (e.g. open 09:00, close 02:00)
  // Treat 00:00 as end of day (1440 = 24:00)
  if (closeMinutes === 0) closeMinutes = 1440

  let isOpen
  if (closeMinutes <= openMinutes) {
    // Overnight: e.g. open 18:00, close 02:00
    isOpen = currentMinutes >= openMinutes || currentMinutes <= closeMinutes
  } else {
    // Normal: e.g. open 09:00, close 21:00
    isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes
  }

  if (isOpen) return { open: true, label: 'Open' }
  return { open: false, label: `Opens at ${hours.openTime}` }
}

export default function ShopBanner({ shop, distance }) {
  const status = getStoreOpenStatus(shop)

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
            <Badge variant={status.open ? 'success' : 'danger'}>{status.label}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {shop.estimatedDeliveryTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {shop.estimatedDeliveryTime}
              </span>
            )}
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

          {/* Delivery info row */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            {shop.isDeliveryAvailable && (
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                {shop.deliveryCharges > 0
                  ? `₹${shop.deliveryCharges} delivery`
                  : 'Free delivery'}
              </span>
            )}
            {shop.freeDeliveryAbove > 0 && shop.deliveryCharges > 0 && (
              <span className="text-green-600 font-medium">
                Free above ₹{shop.freeDeliveryAbove}
              </span>
            )}
            {shop.minimumOrderAmount > 0 && (
              <span className="flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                Min ₹{shop.minimumOrderAmount}
              </span>
            )}
          </div>

          {/* Business hours */}
          {shop.businessHours?.openTime && shop.businessHours?.closeTime && (
            <div className="mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {shop.businessHours.openTime} – {shop.businessHours.closeTime}
                {shop.businessHours.offDays?.length > 0 && (
                  <span className="ml-1 text-gray-400">
                    · Closed: {shop.businessHours.offDays.map(d => d.slice(0, 3)).join(', ')}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
