import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MapPin,
  Store,
  Phone,
  Package,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react'
import { orderService } from '../services/orderService'
import OrderTimeline from '../components/OrderTimeline'
import Badge from '../components/Badge'
import { formatPrice } from '../utils/formatters'
import { ORDER_STATUS_LABELS } from '../utils/constants'
import { Skeleton } from '../components/Skeleton'

export default function OrderTrackingPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrderById(id).then((res) => res.data.order),
    refetchInterval: 15000, // Poll every 15 seconds for status updates
  })

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-40 h-6" />
        </div>
        <Skeleton className="w-full h-48 rounded-2xl mb-4" />
        <Skeleton className="w-full h-32 rounded-2xl mb-4" />
        <Skeleton className="w-full h-40 rounded-2xl" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-heading text-xl font-bold text-gray-800 mb-2">
          Order Not Found
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          We couldn't find this order. It may have been removed.
        </p>
        <button
          onClick={() => navigate('/orders')}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm"
        >
          View All Orders
        </button>
      </motion.div>
    )
  }

  const statusVariant = getStatusVariant(order.status)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-4 pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900">
              Order Tracking
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              #{order._id?.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
        <Badge variant={statusVariant}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </Badge>
      </div>

      {/* Timeline */}
      <Section title="Order Status" icon={Clock}>
        <OrderTimeline currentStatus={order.status} />
      </Section>

      {/* Shop info */}
      {order.shop && (
        <Section title="Shop" icon={Store}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {order.shop.shopName}
              </p>
              {order.shop.location && (
                <p className="text-xs text-gray-400">{order.shop.location}</p>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Delivery address */}
      {order.address && (
        <Section title="Delivery Address" icon={MapPin}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {order.address.label || 'Delivery Address'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {[
                  order.address.houseNumber,
                  order.address.fullAddress,
                  order.address.landmark,
                  order.address.city,
                  order.address.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Order Items */}
      <Section title="Order Items" icon={Package}>
        <div className="space-y-2.5">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">
                  {item.productName || item.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatPrice(item.price)} × {item.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 shrink-0 ml-3">
                {formatPrice(item.subtotal || item.price * item.quantity)}
              </span>
            </div>
          ))}
          <div className="pt-2.5 mt-2.5 border-t border-gray-100 flex justify-between">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </Section>

      {/* Payment & Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Payment</span>
          <span className="font-medium text-gray-800">{order.paymentMethod || 'COD'}</span>
        </div>
        {order.notes && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Notes</span>
            <span className="text-gray-700 text-right max-w-[60%]">{order.notes}</span>
          </div>
        )}
      </div>

      {/* Cancel button for pending orders */}
      {order.status === 'pending' && (
        <CancelButton orderId={order._id} />
      )}
    </motion.div>
  )
}

/* ================================
   Cancel Button
================================ */
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CancelButton({ orderId }) {
  const queryClient = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate()
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleCancel}
      disabled={cancelMutation.isPending}
      className="w-full py-3.5 border-2 border-red-200 text-red-600 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {cancelMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <XCircle className="w-4 h-4" />
          Cancel Order
        </>
      )}
    </motion.button>
  )
}

/* ================================
   Section
================================ */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="font-subheading font-semibold text-sm text-gray-700">{title}</h3>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        {children}
      </div>
    </div>
  )
}

function getStatusVariant(status) {
  switch (status) {
    case 'pending': return 'warning'
    case 'accepted':
    case 'packing':
    case 'ready': return 'primary'
    case 'out_for_delivery': return 'primary'
    case 'delivered': return 'success'
    case 'cancelled': return 'danger'
    default: return 'default'
  }
}
