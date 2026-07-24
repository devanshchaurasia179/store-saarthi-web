import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
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
} from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useShopDetails } from '../hooks/useShop'
import { addressService } from '../services/addressService'
import { orderService } from '../services/orderService'
import { formatPrice } from '../utils/formatters'
import { DELIVERY_CHARGE, FREE_DELIVERY_ABOVE } from '../utils/constants'
import AddressCard from '../components/AddressCard'
import BottomSheet from '../components/BottomSheet'
import { Skeleton } from '../components/Skeleton'

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: Banknote, enabled: true },
  { id: 'upi', label: 'UPI Payment', icon: Smartphone, enabled: true },
]

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, shopId, shopName, subtotal, totalItems, clearCart } = useCart()
  const { user } = useAuth()

  // Fetch shop details to get UPI ID
  const { data: shopDetails } = useShopDetails(shopId)

  const [selectedAddress, setSelectedAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [orderNotes, setOrderNotes] = useState('')
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [error, setError] = useState('')

  // Fetch addresses
  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getAddresses(),
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

  // Delivery calculation
  const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE
  const grandTotal = subtotal + deliveryCharge

  // Place order mutation
  const orderMutation = useMutation({
    mutationFn: (orderData) => orderService.createOrder(orderData),
    onSuccess: (res) => {
      const orderId = res.data.order?._id || res.data.orderId
      const orderNumber = res.data.order?.orderNumber || res.data.orderNumber

      // If UPI selected, open UPI payment intent
      if (paymentMethod === 'upi' && shopDetails?.upiId) {
        const upiLink = buildUpiLink({
          upiId: shopDetails.upiId,
          payeeName: shopName,
          amount: grandTotal,
          orderId: orderNumber || orderId,
        })
        window.location.href = upiLink
      }

      clearCart()
      navigate('/order-success', {
        state: { orderId, orderNumber },
        replace: true,
      })
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.')
    },
  })

  const handlePlaceOrder = () => {
    setError('')

    if (!selectedAddress) {
      setError('Please select a delivery address')
      return
    }

    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }

    if (paymentMethod === 'upi' && !shopDetails?.upiId) {
      setError('This shop has not set up UPI payments yet. Please choose Cash on Delivery.')
      return
    }

    const orderData = {
      shop: shopId,
      items: items.map((item) => ({
        product: item.id,
        quantity: item.quantity,
      })),
      address: {
        label: selectedAddress.label,
        fullAddress: selectedAddress.fullAddress,
        houseNumber: selectedAddress.houseNumber || '',
        landmark: selectedAddress.landmark || '',
        city: selectedAddress.city || '',
        state: selectedAddress.state || '',
        pincode: selectedAddress.pincode || '',
      },
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

      {/* Delivery Address */}
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

      {/* Payment Method */}
      <Section title="Payment Method" icon={CreditCard}>
        <div className="space-y-2.5">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon
            const isSelected = paymentMethod === method.id
            const isUpiUnavailable = method.id === 'upi' && !shopDetails?.upiId
            const disabled = !method.enabled || isUpiUnavailable
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
                      Pay to: {shopDetails.upiId}
                    </p>
                  )}
                  {isUpiUnavailable && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Not available for this shop
                    </p>
                  )}
                </div>
                {method.badge && (
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                    {method.badge}
                  </span>
                )}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
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
      <Section title="Bill Summary" icon={Truck}>
        <div className="space-y-2.5">
          <BillRow label="Subtotal" value={formatPrice(subtotal)} />
          <BillRow
            label="Delivery"
            value={deliveryCharge === 0 ? 'FREE' : formatPrice(deliveryCharge)}
            valueClass={deliveryCharge === 0 ? 'text-green-600' : ''}
          />
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
              disabled={orderMutation.isPending || !selectedAddress}
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
   UPI Deep Link Builder
================================ */
function buildUpiLink({ upiId, payeeName, amount, orderId }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: `Order #${orderId}`,
  })
  return `upi://pay?${params.toString()}`
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
