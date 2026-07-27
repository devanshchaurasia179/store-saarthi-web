import { useState, useMemo, useEffect } from 'react'
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
} from 'lucide-react'
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

const ALL_PAYMENT_METHODS = [
  { id: 'cod', backendKey: 'COD', label: 'Cash on Delivery', icon: Banknote },
  { id: 'upi', backendKey: 'UPI', label: 'Pay Online (UPI)', icon: Smartphone },
]

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

  // Delivery orders require login — redirect inside useEffect
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
    pincode: '',
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

    if (!newAddress.fullAddress.trim()) {
      setProfileError('Please enter your full address')
      return
    }

    setProfileSaving(true)
    try {
      // Silently get user's current location (high accuracy with retry)
      let latitude = null
      let longitude = null
      try {
        // First attempt with high accuracy (GPS)
        let position
        try {
          position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            })
          })
        } catch (firstErr) {
          // If high accuracy fails (timeout on desktop), retry with lower accuracy
          if (firstErr.code === firstErr.TIMEOUT) {
            position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000,
              })
            })
          } else {
            throw firstErr
          }
        }

        latitude = position.coords.latitude
        longitude = position.coords.longitude

        // Reject if accuracy is worse than 500 meters (too vague)
        if (position.coords.accuracy > 500) {
          setProfileSaving(false)
          setProfileError('Unable to get accurate location. Please ensure GPS is enabled and try again.')
          return
        }
      } catch (locErr) {
        setProfileSaving(false)
        if (locErr.code === 1) {
          setProfileError('Location permission denied. Please allow location access in your browser settings for delivery.')
        } else {
          setProfileError('Unable to get your location. Please enable GPS/location services and try again.')
        }
        return
      }

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
          latitude,
          longitude,
          isDefault: true,
        })
        queryClient.setQueryData(['addresses'], addressRes.data.addresses)
        updateUser((prev) => ({ ...prev, addresses: addressRes.data.addresses }))
        // Auto-select the newly added address
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

  // Place order mutation
  const orderMutation = useMutation({
    mutationFn: (orderData) => isDineIn
      ? orderService.createDineInOrder(orderData)
      : orderService.createOrder(orderData),
    onSuccess: async (res) => {
      const orderId = res.data.order?._id || res.data.orderId
      const orderNumber = res.data.order?.orderNumber || res.data.orderNumber

      // If UPI/online payment selected, initiate Razorpay Checkout
      if (paymentMethod === 'upi') {
        try {
          await initiateRazorpayPayment(orderId, orderNumber)
        } catch (err) {
          // Payment was dismissed or failed — order is still created with pending payment
          setError('Payment was not completed. You can retry from your orders page.')
        }
        return
      }

      // COD — go directly to success
      clearCart()
      navigate('/order-success', {
        state: { orderId, orderNumber, estimatedDeliveryTime: shopDetails?.estimatedDeliveryTime || '', orderType },
        replace: true,
      })
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.')
    },
  })

  // Razorpay payment flow
  const initiateRazorpayPayment = async (orderId, orderNumber) => {
    // 1. Create Razorpay order on backend
    const payRes = await orderService.createPaymentOrder(orderId)
    const { razorpayOrderId, amount, currency, keyId } = payRes.data

    // 2. Open Razorpay Checkout
    return new Promise((resolve, reject) => {
      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: shopName || 'Store Saarthi',
        description: `Order #${orderNumber || orderId}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#4F46E5',
        },
        handler: async function (response) {
          try {
            // 3. Verify payment on backend
            await orderService.verifyPayment(orderId, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            })

            // 4. Payment verified — navigate to success
            clearCart()
            navigate('/order-success', {
              state: { orderId, orderNumber, estimatedDeliveryTime: shopDetails?.estimatedDeliveryTime || '', orderType },
              replace: true,
            })
            resolve()
          } catch (verifyErr) {
            setError('Payment was received but verification failed. Please contact support.')
            reject(verifyErr)
          }
        },
        modal: {
          ondismiss: function () {
            setError('Payment cancelled. Your order is saved — you can retry payment from your orders.')
            reject(new Error('Payment dismissed'))
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        setError(`Payment failed: ${response.error.description || 'Please try again.'}`)
        reject(new Error(response.error.description))
      })
      rzp.open()
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

    if (paymentMethod === 'upi' && !import.meta.env.VITE_RAZORPAY_KEY_ID) {
      setError('Online payment is not configured. Please choose Cash on Delivery.')
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
                  {formatPrice(item.price)} × {item.quantity}
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
              <>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Full Address</label>
                  <input
                    type="text"
                    value={newAddress.fullAddress}
                    onChange={(e) => setNewAddress((a) => ({ ...a, fullAddress: e.target.value }))}
                    placeholder="Street, area, locality"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">House / Flat No.</label>
                    <input
                      type="text"
                      value={newAddress.houseNumber}
                      onChange={(e) => setNewAddress((a) => ({ ...a, houseNumber: e.target.value }))}
                      placeholder="e.g. B-204"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Landmark</label>
                    <input
                      type="text"
                      value={newAddress.landmark}
                      onChange={(e) => setNewAddress((a) => ({ ...a, landmark: e.target.value }))}
                      placeholder="Near..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">City</label>
                    <input
                      type="text"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))}
                      placeholder="City"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Pincode</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      placeholder="6-digit"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </>
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
              {profileSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save & Continue'
              )}
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
              const isUpiUnavailable = method.id === 'upi' && !import.meta.env.VITE_RAZORPAY_KEY_ID
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
                    {method.id === 'upi' && import.meta.env.VITE_RAZORPAY_KEY_ID && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        UPI, Cards, Netbanking & more
                      </p>
                    )}
                    {isUpiUnavailable && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Online payment not configured
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
