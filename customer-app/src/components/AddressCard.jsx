import { motion } from 'framer-motion'
import { MapPin, Edit2, Trash2, Check } from 'lucide-react'

export default function AddressCard({
  address,
  selected = false,
  selectable = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileTap={selectable ? { scale: 0.98 } : undefined}
      onClick={() => selectable && onSelect?.(address)}
      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${
        selected
          ? 'border-primary bg-primary-50/40 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      {/* Default badge */}
      {address.isDefault && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 bg-primary text-white text-[10px] font-semibold rounded-md">
          <Check className="w-2.5 h-2.5" />
          Default
        </span>
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <MapPin className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-subheading font-semibold text-sm text-gray-800">
              {address.label || 'Address'}
            </h4>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {buildAddressLine(address)}
          </p>

          {address.landmark && (
            <p className="text-xs text-gray-400 mt-1">
              Near: {address.landmark}
            </p>
          )}

          {/* Actions */}
          {(onEdit || onDelete || onSetDefault) && (
            <div className="flex items-center gap-3 mt-3">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(address) }}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
              {onSetDefault && !address.isDefault && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSetDefault(address) }}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Set Default
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(address) }}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {selectable && (
        <div className="absolute top-4 right-4">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected
                ? 'border-primary bg-primary'
                : 'border-gray-300 bg-white'
            }`}
          >
            {selected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function buildAddressLine(address) {
  const parts = [
    address.houseNumber,
    address.fullAddress,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean)
  return parts.join(', ')
}
