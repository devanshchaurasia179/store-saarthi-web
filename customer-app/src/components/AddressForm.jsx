import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Loader2, Navigation } from 'lucide-react'

const LABELS = ['Home', 'Work', 'Other']

export default function AddressForm({ initialData = null, onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState({
    label: initialData?.label || 'Home',
    fullAddress: initialData?.fullAddress || '',
    houseNumber: initialData?.houseNumber || '',
    landmark: initialData?.landmark || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    pincode: initialData?.pincode || '',
    isDefault: initialData?.isDefault || false,
  })
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!form.fullAddress.trim()) newErrors.fullAddress = 'Address is required'
    if (!form.city.trim()) newErrors.city = 'City is required'
    if (!form.pincode.trim()) newErrors.pincode = 'Pincode is required'
    else if (!/^\d{6}$/.test(form.pincode.trim())) newErrors.pincode = 'Enter valid 6-digit pincode'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Just store coordinates — reverse geocoding would need an API
        handleChange('fullAddress', `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`)
      },
      () => {
        // Silently fail
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Label selector */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Save as
        </label>
        <div className="flex gap-2">
          {LABELS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleChange('label', label)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                form.label === label
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Use current location */}
      <button
        type="button"
        onClick={handleUseLocation}
        className="w-full flex items-center gap-3 px-4 py-3 border border-dashed border-primary/40 rounded-xl text-sm font-medium text-primary hover:bg-primary-50/50 transition-colors"
      >
        <Navigation className="w-4 h-4" />
        Use current location
      </button>

      {/* House Number */}
      <InputField
        label="House / Flat / Floor No."
        placeholder="e.g., B-12, 2nd Floor"
        value={form.houseNumber}
        onChange={(val) => handleChange('houseNumber', val)}
      />

      {/* Full Address */}
      <InputField
        label="Full Address *"
        placeholder="Street, Area, Colony"
        value={form.fullAddress}
        onChange={(val) => handleChange('fullAddress', val)}
        error={errors.fullAddress}
        multiline
      />

      {/* Landmark */}
      <InputField
        label="Landmark"
        placeholder="Near temple, mall, etc."
        value={form.landmark}
        onChange={(val) => handleChange('landmark', val)}
      />

      {/* City & State row */}
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="City *"
          placeholder="City"
          value={form.city}
          onChange={(val) => handleChange('city', val)}
          error={errors.city}
        />
        <InputField
          label="State"
          placeholder="State"
          value={form.state}
          onChange={(val) => handleChange('state', val)}
        />
      </div>

      {/* Pincode */}
      <InputField
        label="Pincode *"
        placeholder="6-digit pincode"
        value={form.pincode}
        onChange={(val) => handleChange('pincode', val.replace(/\D/g, '').slice(0, 6))}
        error={errors.pincode}
        inputMode="numeric"
      />

      {/* Default toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
            form.isDefault ? 'border-primary bg-primary' : 'border-gray-300'
          }`}
          onClick={() => handleChange('isDefault', !form.isDefault)}
        >
          {form.isDefault && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="text-sm text-gray-700">Set as default address</span>
      </label>

      {/* Map preview placeholder */}
      <div className="w-full h-32 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
        <div className="text-center">
          <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Map preview</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          disabled={loading}
          className="flex-1 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>{initialData ? 'Update Address' : 'Save Address'}</>
          )}
        </motion.button>
      </div>
    </form>
  )
}

/* ================================
   Reusable Input Field
================================ */
function InputField({ label, placeholder, value, onChange, error, multiline = false, inputMode }) {
  const baseClass = `w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-primary focus:bg-white ${
    error ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
  }`

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
