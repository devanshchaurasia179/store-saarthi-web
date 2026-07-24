import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Loader2, Navigation, CheckCircle2, Search, X } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const LABELS = ['Home', 'Work', 'Other']
const DEFAULT_CENTER = [20.5937, 78.9629] // India center
const DEFAULT_ZOOM = 5

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
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
  })
  const [errors, setErrors] = useState({})
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef(null)

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
    if (!form.latitude || !form.longitude) newErrors.location = 'Please select your location on map'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

  // Reverse geocode using Nominatim (free, no key)
  const reverseGeocode = useCallback((lat, lng) => {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.address) {
          const addr = data.address
          setForm((prev) => ({
            ...prev,
            fullAddress: data.display_name?.split(',').slice(0, 4).join(', ') || prev.fullAddress,
            city: addr.city || addr.town || addr.village || addr.county || prev.city,
            state: addr.state || prev.state,
            pincode: addr.postcode || prev.pincode,
          }))
        }
      })
      .catch(() => {})
  }, [])

  // Set position from any source
  const setPosition = useCallback((lat, lng) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
    setErrors((prev) => ({ ...prev, location: '' }))
    reverseGeocode(lat, lng)
  }, [reverseGeocode])

  // Search places using Nominatim
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!query.trim() || query.length < 3) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearching(true)
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      )
        .then((res) => res.json())
        .then((results) => {
          setSearchResults(results || [])
          setShowResults(true)
          setSearching(false)
        })
        .catch(() => {
          setSearching(false)
          setSearchResults([])
        })
    }, 400) // debounce 400ms
  }, [])

  // Select a search result
  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const addr = result.address || {}

    setForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      fullAddress: result.display_name?.split(',').slice(0, 4).join(', ') || prev.fullAddress,
      city: addr.city || addr.town || addr.village || addr.county || prev.city,
      state: addr.state || prev.state,
      pincode: addr.postcode || prev.pincode,
    }))
    setErrors((prev) => ({ ...prev, location: '' }))
    setSearchQuery(result.display_name?.split(',').slice(0, 2).join(', ') || '')
    setShowResults(false)
    setSearchResults([])
  }

  // Use device GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      return
    }
    setLocating(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setPosition(latitude, longitude)
        setLocating(false)
      },
      (error) => {
        setLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please allow access in browser settings.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable. Try again.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out.')
            break
          default:
            setLocationError('Unable to get location.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const markerPosition = form.latitude && form.longitude ? [form.latitude, form.longitude] : null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Label selector */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Save as</label>
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

      {/* Search bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search for your location..."
            className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-primary focus:bg-white"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
          {searchQuery && !searching && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <button
                key={result.place_id || idx}
                type="button"
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <p className="text-sm text-gray-800 line-clamp-1">{result.display_name?.split(',').slice(0, 2).join(', ')}</p>
                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{result.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current location button */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={locating}
        className={`w-full flex items-center gap-3 px-4 py-3 border border-dashed rounded-xl text-sm font-medium transition-colors ${
          form.latitude && form.longitude
            ? 'border-green-400 bg-green-50/50 text-green-700'
            : 'border-primary/40 text-primary hover:bg-primary-50/50'
        } disabled:opacity-60`}
      >
        {locating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : form.latitude && form.longitude ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <Navigation className="w-4 h-4" />
        )}
        {locating
          ? 'Getting your location...'
          : form.latitude && form.longitude
            ? 'Location captured — tap to recapture'
            : 'Use current location'}
      </button>

      {locationError && <p className="text-xs text-red-500 ml-1">{locationError}</p>}
      {errors.location && !locationError && (
        <p className="text-xs text-red-500 ml-1">{errors.location}</p>
      )}

      {/* Leaflet Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <MapContainer
          center={markerPosition || DEFAULT_CENTER}
          zoom={markerPosition ? 17 : DEFAULT_ZOOM}
          style={{ height: '220px', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPositionChange={setPosition} />
          {markerPosition && <DraggableMarker position={markerPosition} onPositionChange={setPosition} />}
          <MapUpdater position={markerPosition} />
        </MapContainer>
        {markerPosition && (
          <p className="text-xs text-gray-500 px-3 py-1.5 bg-gray-50 border-t border-gray-100">
            📍 {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)} — drag pin or tap map to adjust
          </p>
        )}
      </div>

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
   Map Click Handler
================================ */
function MapClickHandler({ onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/* ================================
   Draggable Marker
================================ */
function DraggableMarker({ position, onPositionChange }) {
  const markerRef = useRef(null)

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker) {
        const { lat, lng } = marker.getLatLng()
        onPositionChange(lat, lng)
      }
    },
  }

  return (
    <Marker
      ref={markerRef}
      position={position}
      draggable
      eventHandlers={eventHandlers}
    />
  )
}

/* ================================
   Map Updater (pan to new position)
================================ */
function MapUpdater({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.flyTo(position, 17, { duration: 0.8 })
    }
  }, [position, map])

  return null
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
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
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
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
