import { motion } from 'framer-motion'
import {
  Clock,
  CheckCircle,
  Package,
  PackageCheck,
  Truck,
  Home,
  XCircle,
} from 'lucide-react'
import { ORDER_STATUS } from '../utils/constants'

const TIMELINE_STEPS = [
  { status: ORDER_STATUS.PENDING, label: 'Order Placed', icon: Clock },
  { status: ORDER_STATUS.ACCEPTED, label: 'Accepted', icon: CheckCircle },
  { status: ORDER_STATUS.PACKING, label: 'Packing', icon: Package },
  { status: ORDER_STATUS.READY, label: 'Ready', icon: PackageCheck },
  { status: ORDER_STATUS.OUT_FOR_DELIVERY, label: 'Out for Delivery', icon: Truck },
  { status: ORDER_STATUS.DELIVERED, label: 'Delivered', icon: Home },
]

function getStepIndex(status) {
  const idx = TIMELINE_STEPS.findIndex((s) => s.status === status)
  return idx === -1 ? 0 : idx
}

export default function OrderTimeline({ currentStatus }) {
  const isCancelled = currentStatus === ORDER_STATUS.CANCELLED
  const currentIndex = isCancelled ? -1 : getStepIndex(currentStatus)

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
        <XCircle className="w-6 h-6 text-red-500" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Order Cancelled</p>
          <p className="text-xs text-red-500">This order has been cancelled</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, index) => {
        const Icon = step.icon
        const isCompleted = index <= currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === TIMELINE_STEPS.length - 1

        return (
          <div key={step.status} className="flex gap-3">
            {/* Line and dot */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isCurrent
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : isCompleted
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
              </motion.div>
              {!isLast && (
                <div
                  className={`w-0.5 h-8 transition-colors ${
                    index < currentIndex ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            {/* Label */}
            <div className="pt-1.5 pb-3">
              <p
                className={`text-sm font-medium ${
                  isCurrent
                    ? 'text-primary'
                    : isCompleted
                    ? 'text-gray-800'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>
              {isCurrent && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-gray-400 mt-0.5"
                >
                  Current status
                </motion.p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
