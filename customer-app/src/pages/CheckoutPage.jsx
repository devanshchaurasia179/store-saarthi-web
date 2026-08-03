import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  MapPin,
  ChevronRight,
  Package,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
  Loader2,
  ShoppingCart,
  Truck,
  AlertCircle,
  UtensilsCrossed,
  User,
  Search,
  X,
  Navigation,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { configureMaps, importLibrary } from '../utils/maps'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useShopDetails } from '../hooks/useShop'
import { addressService } from '../services/addressService'
import { authService } from '../services/authService'
import { orderService } from '../services/orderService'
import { formatPrice } from '../utils/formatters'
import AddressCard from '../components/AddressCard'
import BottomSheet from '../components/BottomSheet'
import { Skeleton } from '../components/Skeleton'

configureMaps()

const ADDRESS_LABELS = ['Home', 'Work', 'Other']

const ALL_PAYMENT_METHODS = [
  { id: 'cod', backendKey: 'COD', label: 'Cash on Delivery', icon: Banknote },
  { id: 'upi', backendKey: 'UPI', label: 'Pay Online (UPI)', icon: Smartphone },
]

/* ================================
   Compact inline address form with Google Maps
================================ */
function InlineAddressForm({ value, onChange }) {
  const [mapsReady, setMapsReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  const mapRef = useRef(null)
  const googleMapRef = useRef(null)
  const markerRef = useRef(null)
  const geocoderRef = useRef(null)
  const autocompleteRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    Promise.all([
      importLibrary('maps'),
      importLibrary('places'),
      importLibrary('geocoding'),
    ]).then(() => setMapsReady(true)).catch(console.error)
  }, [])

  // Helpers
  const extractCity = (components) => {
    const get = (t) => components.find((c) => c.types.includes(t))?.long_name || ''
    return get('locality') || get('administrative_area_level_3') || get('administrative_area_level_2') || get('sublocality_level_1') || ''
  }
  const buildAddress = (formatted) => {
    if (!formatted) return ''
    return formatted.split(',').map((p) => p.trim()).filter((p) => p.toLowerCase() !== 'india').slice(0, 4).join(', ')
  }

  const applyGeoResult = useCallback((result, lat, lng) => {
    const components = result.address_components
    const get = (t) => components.find((c) => c.types.includes(t))?.long_name || ''
    onChange((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      fullAddress: buildAddress(result.formatted_address) || prev.fullAddress,
      city: extractCity(components) || prev.city,
      state: get('administrative_area_level_1') || prev.state,
      pincode: get('postal_code') || prev.pincode,
    }))
  }, [onChange])

  const placeMarker = useCallback((lat, lng, mapInstance) => {
    const map = mapInstance || googleMapRef.current
    if (!map) return
    const pos = { lat, lng }
    if (markerRef.current) {
      markerRef.current.setPosition(pos)
    } else {
      markerRef.current = new window.google.maps.Marker({ position: pos, map, draggable: true })
      markerRef.current.addListener('dragend', () => {
        const p = markerRef.current.getPosition()
        reverseGeocode(p.lat(), p.lng())
      })
    }
    map.panTo(pos)
    if (map.getZoom() < 15) map.setZoom(17)
  }, [])

  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) applyGeoResult(results[0], lat, lng)
    })
  }, [applyGeoResult])

  // Init map
  useEffect(() => {
    if (!mapsReady || !mapRef.current || googleMapRef.current) return
    const center = value.latitude && value.longitude
      ? { lat: value.latitude, lng: value.longitude }
      : { lat: 20.5937, lng: 78.9629 }
    const zoom = value.latitude && value.longitude ? 17 : 5
    const map = new window.google.maps.Map(mapRef.current, {
      center, zoom,
      zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
    })
    if (value.latitude && value.longitude) {
      markerRef.current = new window.google.maps.Marker({ position: center, map, draggable: true })
      markerRef.current.addListener('dragend', () => {
        const p = markerRef.current.getPosition()
        reverseGeocode(p.lat(), p.lng())
      })
    }
    map.addListener('click', (e) => {
      const lat = e.latLng.lat(), lng = e.latLng.lng()
      placeMarker(lat, lng, map)
      reverseGeocode(lat, lng)
    })
    googleMapRef.current = map
    geocoderRef.current = new window.google.maps.Geocoder()
    autocompleteRef.current = new window.google.maps.places.AutocompleteService()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady])

  // Search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!query.trim() || query.length < 3) { setSearchResults([]); setShowResults(false); return }
    searchTimeoutRef.current = setTimeout(() => {
      if (!autocompleteRef.current) return
      setSearching(true)
      autocompleteRef.current.getPlacePredictions(
        { input: query, componentRestrictions: { country: 'in' }, types: ['geocode', 'establishment'] },
        (predictions, status) => {
          setSearching(false)
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSearchResults(predictions); setShowResults(true)
          } else setSearchResults([])
        }
      )
    }, 400)
  }, [])

  const selectPrediction = (prediction) => {
    if (!geocoderRef.current) return
    setSearchQuery(prediction.description.split(',').slice(0, 2).join(', '))
    setShowResults(false); setSearchResults([])
    geocoderRef.current.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location
        const lat = loc.lat(), lng = loc.lng()
        applyGeoResult(results[0], lat, lng)
        placeMarker(lat, lng)
        const map = googleMapRef.current
        if (map) { map.panTo({ lat, lng }); map.setZoom(17) }
      }
    })
  }

  // GPS
  const handleGPS = () => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return }
    setLocating(true); setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        placeMarker(lat, lng)
        reverseGeocode(lat, lng)
        onChange((prev) => ({ ...prev, latitude: lat, longitude: lng }))
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setLocationError(err.code === 1 ? 'Location permission denied.' : 'Unable to get location.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const hasLocation = value.latitude && value.longitude

  return (
    <div className="space-y-3">
      {/* Label selector */}
      <div className="flex gap-2">
        {ADDRESS_LABELS.map((lbl) => (
          <button
            key={lbl}
            type="button"
            onClick={() => onChange((prev) => ({ ...prev, label: lbl }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              value.label === lbl ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          placeholder="Search your location..."
          className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
        />
        {searching
          ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
          : searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false) }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )
        }
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
            {searchResults.map((p, idx) => (
              <button key={p.place_id || idx} type="button" onClick={() => selectPrediction(p)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                <p className="text-xs font-medium text-gray-800 line-clamp-1">{p.structured_formatting?.main_text || p.description.split(',')[0]}</p>
                <p className="text-xs text-gray-400 line-clamp-1">{p.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS button */}
      <button
        type="button"
        onClick={handleGPS}
        disabled={locating}
        className={`w-full flex items-center gap-2 px-3 py-2.5 border border-dashed rounded-xl text-xs font-medium transition-colors ${
          hasLocation ? 'border-green-400 bg-green-50/50 text-green-700' : 'border-primary/40 text-primary hover:bg-primary/5'
        } disabled:opacity-60`}
      >
        {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : hasLocation ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Navigation className="w-3.5 h-3.5" />}
        {locating ? 'Getting location...' : hasLocation ? 'Location set â€” tap to update' : 'Use current location'}
      </button>
      {locationError && <p className="text-xs text-red-500">{locationError}</p>}

      {/* Compact map */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        {!mapsReady
          ? <div className="h-[160px] flex items-center justify-center bg-gray-50"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          : <div ref={mapRef} style={{ height: '160px', width: '100%' }} />
        }
        {hasLocation && (
          <p className="text-xs text-gray-400 px-3 py-1 bg-gray-50 border-t border-gray-100">
            ðŸ“ {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)} â€” drag pin or tap to adjust
          </p>
        )}
      </div>

      {/* Address fields */}
      <input
        type="text"
        value={value.fullAddress}
        onChange={(e) => onChange((prev) => ({ ...prev, fullAddress: e.target.value }))}
        placeholder="Full address *"
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
      />
      <input
        type="text"
        value={value.houseNumber}
        onChange={(e) => onChange((prev) => ({ ...prev, houseNumber: e.target.value }))}
        placeholder="House / Flat No. (optional)"
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={value.city}
          onChange={(e) => onChange((prev) => ({ ...prev, city: e.target.value }))}
          placeholder="City *"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
        />
        <input
          type="text"
          inputMode="numeric"
          value={value.pincode}
          onChange={(e) => onChange((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
          placeholder="Pincode *"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
        />
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { items, shopId, shopName, subtotal, totalItems, clearCart } = useCart()
  const { user, isAuthenticated, updateUser } = useAuth()

  // Order type from OrderTypePage
  const orderType = location.state?.orderType || 'delivery'
  const tableNumber = location.state?.tableNumber || ''
  const isDineIn = orderType === 'dineIn'

  // Delivery orders require login â€” redirect inside useEffect
  const needsLogin = !isDineIn && !isAuthenticated
  useEffect(() => {
    if (needsLogin) {
      navigate('/login', { state: { from: '/checkout' }, replace: true })
    }
  }, [needsLogin, navigate])

  // Fetch shop details to get UPI ID
  const { data: shopDetails } = useShopDetails(shopId)

  const [selectedAddress, setSelectedAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [orderNotes, setOrderNotes] = useState('')
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [error, setError] = useState('')

  // New user profile completion state
  const [profileName, setProfileName] = useState(user?.name || '')
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    fullAddress: '',
    houseNumber: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    latitude: null,
    longitude: null,
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Fetch addresses (only for delivery orders)
  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getAddresses(),
    enabled: !isDineIn,
    onSuccess: (data) => {
      // Auto-select default address
      if (!selectedAddress && data.length > 0) {
        const defaultAddr = data.find((a) => a.isDefault) || data[0]
        setSelectedAddress(defaultAddr)
      }
    },
  })

  // Auto-select default address when data loads
  useMemo(() => {
    if (!selectedAddress && addresses.length > 0) {
      const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0]
      setSelectedAddress(defaultAddr)
    }
  }, [addresses, selectedAddress])

  // Filter payment methods based on what the shop accepts
  const acceptedMethods = shopDetails?.acceptedPaymentMethods || ['COD']
  const availablePaymentMethods = ALL_PAYMENT_METHODS.filter((m) =>
    acceptedMethods.includes(m.backendKey)
  )

  // Auto-select first available payment method if current selection is no longer valid
  useMemo(() => {
    const isCurrentMethodAvailable = availablePaymentMethods.some((m) => m.id === paymentMethod)
    if (!isCurrentMethodAvailable && availablePaymentMethods.length > 0) {
      setPaymentMethod(availablePaymentMethods[0].id)
    }
  }, [availablePaymentMethods, paymentMethod])

  // Delivery calculation from backend shop settings
  const shopDeliveryCharge = shopDetails?.deliveryCharges ?? 30

  // If user needs login, show nothing while redirect happens
  if (needsLogin) {
    return null
  }

  // Check if new user needs to complete profile (name + address) for delivery
  const needsProfileCompletion = !isDineIn && isAuthenticated && (!user?.name || addresses.length === 0)

  const handleSaveProfile = async () => {
    setProfileError('')

    if (!profileName.trim()) {
      setProfileError('Please enter your name')
      return
    }

    if (addresses.length === 0) {
      if (!newAddress.fullAddress.trim()) {
        setProfileError('Please enter your full address')
        return
      }
      if (!newAddress.city.trim()) {
        setProfileError('Please enter your city')
        return
      }
      if (!newAddress.pincode.trim() || !/^\d{6}$/.test(newAddress.pincode)) {
        setProfileError('Please enter a valid 6-digit pincode')
        return
      }
      if (!newAddress.latitude || !newAddress.longitude) {
        setProfileError('Please pin your location on the map or use GPS')
        return
      }
    }

    setProfileSaving(true)
    try {
      // Save name if missing
      if (!user?.name) {
        const profileRes = await authService.updateProfile({ name: profileName.trim() })
        updateUser(profileRes.data.customer)
      }

      // Save address if none exist
      if (addresses.length === 0) {
        const addressRes = await addressService.addAddress({
          ...newAddress,
          fullAddress: newAddress.fullAddress.trim(),
          isDefault: true,
        })
        queryClient.setQueryData(['addresses'], addressRes.data.addresses)
        updateUser((prev) => ({ ...prev, addresses: addressRes.data.addresses }))
        if (addressRes.data.addresses.length > 0) {
          setSelectedAddress(addressRes.data.addresses[0])
        }
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to save. Please try again.')
    } finally {
      setProfileSaving(false)
    }
  }

  const shopFreeDeliveryAbove = shopDetails?.freeDeliveryAbove ?? 0
  const deliveryCharge = isDineIn ? 0 : ((shopFreeDeliveryAbove > 0 && subtotal >= shopFreeDeliveryAbove) ? 0 : shopDeliveryCharge)
  const grandTotal = subtotal + deliveryCharge

  const [upiPayment, setUpiPayment] = useState(null) // { orderId, orderNumber, upiId, payeeName, amount }

  // Place order mutation
  const orderMutation = useMutation({
    mutationFn: (orderData) => isDineIn
      ? orderService.createDineInOrder(orderData)
      : orderService.createOrder(orderData),
    onSuccess: async (res) => {
      const orderId = res.data.order?._id || res.data.orderId
      const orderNumber = res.data.order?.orderNumber || res.data.orderNumber

      // If UPI payment selected, show payment screen using already-loaded shop details
      // (no extra backend call needed â€” upiId and grandTotal are already on the client)
      if (paymentMethod === 'upi') {
        setUpiPayment({
          orderId,
          orderNumber,
          upiId: shopDetails?.upiId || '',
          payeeName: shopDetails?.shopName || shopName || '',
          amount: grandTotal,
        })
        return
      }

      // COD â€” go directly to success
      clearCart()
      navigate('/order-success', {
        state: { orderId, orderNumber, estimatedDeliveryTime: shopDetails?.estimatedDeliveryTime || '', orderType, orderStatus: res.data.order?.status || 'pending' },
        replace: true,
      })
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.')
    },
  })

  // Called after customer taps "Open UPI App" â€” go straight to order success
  const handleUpiOpen = () => {
    if (!upiPayment) return
    clearCart()
    navigate('/order-success', {
      state: {
        orderId: upiPayment.orderId,
        orderNumber: upiPayment.orderNumber,
        estimatedDeliveryTime: shopDetails?.estimatedDeliveryTime || '',
        orderType,
      },
      replace: true,
    })
  }

  const handlePlaceOrder = () => {
    setError('')

    if (shopDetails?.isStoreOnline === false) {
      setError('This store is currently offline. Please try again later.')
      return
    }

    if (shopDetails?.isOnlineOrderingEnabled === false) {
      setError('Online ordering is currently disabled for this store.')
      return
    }

    if (!isDineIn && !selectedAddress) {
      setError('Please select a delivery address')
      return
    }

    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }

    const minOrder = shopDetails?.minimumOrderAmount ?? 0
    if (minOrder > 0 && subtotal < minOrder) {
      setError(`Minimum order amount is ${formatPrice(minOrder)}`)
      return
    }

    if (paymentMethod === 'upi' && !shopDetails?.upiId) {
      setError('This shop has not configured a UPI ID. Please choose Cash on Delivery.')
      return
    }

    const orderData = {
      shop: shopId,
      orderType: isDineIn ? 'dineIn' : 'delivery',
      ...(isDineIn && { tableNumber }),
      items: items.map((item) => {
        // Variant items have id format: "productId_variantId"
        const parts = item.id.split('_')
        const productId = parts[0]
        const variantId = parts.length > 1 ? parts[1] : undefined
        return {
          product: productId,
          variant: variantId,
          quantity: item.quantity,
        }
      }),
      ...(!isDineIn && {
        address: {
          label: selectedAddress.label,
          fullAddress: selectedAddress.fullAddress,
          houseNumber: selectedAddress.houseNumber || '',
          landmark: selectedAddress.landmark || '',
          city: selectedAddress.city || '',
          state: selectedAddress.state || '',
          pincode: selectedAddress.pincode || '',
        },
      }),
      paymentMethod: paymentMethod === 'cod' ? 'COD' : 'UPI',
      notes: orderNotes.trim(),
    }

    orderMutation.mutate(orderData)
  }

  // Empty cart guard
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-4 py-8"
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-5">
            <ShoppingCart className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="font-subheading text-lg font-semibold text-gray-700 mb-2">
            Nothing to checkout
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Add items to your cart before checking out
          </p>
          <Link
            to={shopId ? `/shop/${shopId}` : '/'}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm"
          >
            Browse Products
          </Link>
        </div>
      </motion.div>
    )
  }

  // UPI payment screen â€” shown after order is created
  if (upiPayment) {
    return (
      <UpiPaymentScreen
        upiId={upiPayment.upiId}
        payeeName={upiPayment.payeeName}
        amount={upiPayment.amount}
        onOpen={handleUpiOpen}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-4 pb-40"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalItems} {totalItems === 1 ? 'item' : 'items'} from {shopName}
          </p>
        </div>
      </div>

      {/* Order Items Summary */}
      <Section title="Order Items" icon={Package}>
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatPrice(item.price)} Ã— {item.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 shrink-0 ml-3">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Order Type Badge */}
      {isDineIn && (
        <div className="mb-5">
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Dine In</p>
              <p className="text-xs text-amber-600">Table No. {tableNumber}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Completion for new users (delivery only) */}
      {!isDineIn && needsProfileCompletion && (
        <Section title="Complete Your Details" icon={User}>
          <div className="space-y-3">
            {!user?.name && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Your Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>
            )}

            {addresses.length === 0 && (
              <InlineAddressForm value={newAddress} onChange={setNewAddress} />
            )}

            {profileError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{profileError}</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Continue'}
            </motion.button>
          </div>
        </Section>
      )}

      {/* Delivery Address (only for delivery orders) */}
      {!isDineIn && !needsProfileCompletion && (
      <Section title="Delivery Address" icon={MapPin}>
        {addressesLoading ? (
          <Skeleton className="w-full h-20 rounded-xl" />
        ) : selectedAddress ? (
          <div
            onClick={() => setShowAddressPicker(true)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {selectedAddress.label}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {[selectedAddress.houseNumber, selectedAddress.fullAddress, selectedAddress.city]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
        ) : (
          <button
            onClick={() => addresses.length > 0 ? setShowAddressPicker(true) : navigate('/address')}
            className="w-full flex items-center gap-3 p-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {addresses.length > 0 ? 'Select an address' : 'Add delivery address'}
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        )}
      </Section>
      )}

      {/* Payment Method */}
      <Section title="Payment Method" icon={CreditCard}>
        <div className="space-y-2.5">
          {availablePaymentMethods.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">
              No payment methods available for this shop
            </p>
          ) : (
            availablePaymentMethods.map((method) => {
              const Icon = method.icon
              const isSelected = paymentMethod === method.id
              const isUpiUnavailable = method.id === 'upi' && !shopDetails?.upiId
              const disabled = isUpiUnavailable
              return (
                <button
                  key={method.id}
                  disabled={disabled}
                  onClick={() => !disabled && setPaymentMethod(method.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary-50/40'
                      : !disabled
                      ? 'border-gray-100 hover:border-gray-200 bg-white'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">
                      {method.label}
                    </span>
                    {method.id === 'upi' && shopDetails?.upiId && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        Pay directly via any UPI app
                      </p>
                    )}
                    {isUpiUnavailable && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        UPI not configured by this shop
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </Section>

      {/* Order Notes */}
      <Section title="Order Notes" icon={FileText}>
        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Any special instructions for your order..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none resize-none focus:border-primary focus:bg-white transition-all"
        />
      </Section>

      {/* Bill Summary */}
      <Section title="Bill Summary" icon={isDineIn ? UtensilsCrossed : Truck}>
        <div className="space-y-2.5">
          <BillRow label="Subtotal" value={formatPrice(subtotal)} />
          {!isDineIn && (
            <>
              <BillRow
                label="Delivery"
                value={deliveryCharge === 0 ? 'FREE' : formatPrice(deliveryCharge)}
                valueClass={deliveryCharge === 0 ? 'text-green-600' : ''}
              />
              {shopFreeDeliveryAbove > 0 && deliveryCharge > 0 && (
                <p className="text-xs text-gray-400">
                  Free delivery on orders above {formatPrice(shopFreeDeliveryAbove)}
                </p>
              )}
            </>
          )}
          {isDineIn && (
            <BillRow label="Delivery" value="N/A (Dine In)" valueClass="text-gray-400" />
          )}
          <div className="pt-2.5 mt-2.5 border-t border-gray-100 flex justify-between">
            <span className="text-base font-bold text-gray-900">Total</span>
            <span className="text-base font-bold text-gray-900">{formatPrice(grandTotal)}</span>
          </div>
        </div>
      </Section>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mt-4"
        >
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </motion.div>
      )}

      {/* Sticky Place Order Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900">{formatPrice(grandTotal)}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePlaceOrder}
              disabled={orderMutation.isPending || (!isDineIn && !selectedAddress) || needsProfileCompletion}
              className="flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {orderMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Place Order</>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Address Picker Bottom Sheet */}
      <BottomSheet
        isOpen={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        title="Select Address"
      >
        <div className="px-5 py-4 space-y-3">
          {addresses.map((addr) => (
            <AddressCard
              key={addr._id}
              address={addr}
              selectable
              selected={selectedAddress?._id === addr._id}
              onSelect={(a) => {
                setSelectedAddress(a)
                setShowAddressPicker(false)
              }}
            />
          ))}
          <button
            onClick={() => { setShowAddressPicker(false); navigate('/address') }}
            className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-primary hover:text-primary transition-colors mt-3"
          >
            + Add new address
          </button>
        </div>
      </BottomSheet>
    </motion.div>
  )
}

/* ================================
   UPI Payment Screen
================================ */
function UpiPaymentScreen({ upiId, payeeName, amount, onOpen }) {
  const [copied, setCopied] = useState(false)

  // Build UPI deep-link â€” no `tn` (transaction note) to avoid bank blocks
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`

  const handleCopy = () => {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto px-4 py-8"
    >
      {/* Icon */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-4">
          <Smartphone className="w-10 h-10 text-indigo-500" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-gray-900 text-center">Pay via UPI</h1>
        <p className="text-sm text-gray-400 mt-1 text-center">
          Open any UPI app and pay to complete your order
        </p>
      </div>

      {/* Amount */}
      <div className="bg-indigo-50 rounded-2xl p-5 mb-5 text-center">
        <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide mb-1">Amount to Pay</p>
        <p className="text-4xl font-bold text-indigo-700">â‚¹{Number(amount).toLocaleString('en-IN')}</p>
        <p className="text-sm text-indigo-400 mt-1">to {payeeName}</p>
      </div>

      {/* UPI ID */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 shadow-sm">
        <p className="text-xs font-medium text-gray-400 mb-2">UPI ID</p>
        <div className="flex items-center gap-3">
          <p className="flex-1 text-base font-semibold text-gray-800 break-all">{upiId}</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors shrink-0"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Open UPI App â€” tapping this also navigates to order success */}
      <a
        href={upiUrl}
        onClick={onOpen}
        className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold text-base transition-colors shadow-lg shadow-indigo-200"
      >
        <ExternalLink className="w-5 h-5" />
        Open UPI App to Pay
      </a>

      <p className="text-xs text-gray-400 text-center mt-3">
        Opens GPay, PhonePe, Paytm or your default UPI app
      </p>
    </motion.div>
  )
}

/* ================================
   Section Wrapper
================================ */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="font-subheading font-semibold text-sm text-gray-700">{title}</h3>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        {children}
      </div>
    </div>
  )
}

/* ================================
   Bill Row
================================ */
function BillRow({ label, value, valueClass = '' }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-800 ${valueClass}`}>{value}</span>
    </div>
  )
}
