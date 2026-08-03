import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Loader2, Navigation, CheckCircle2, Search, X } from 'lucide-react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

const LABELS = ['Home', 'Work', 'Other']
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 } // India center
const DEFAULT_ZOOM = 5
const MAPS_KEY = import.meta.env.VITE_MAPS_KEY

// Configure once — safe to call multiple times
setOptions({ apiKey: MAPS_KEY, version: 'weekly' })

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
  const [mapsReady, setMapsReady] = useState(false)

  const mapRef = useRef(null)         // DOM node for the map div
  const googleMapRef = useRef(null)   // google.maps.Map instance
  const markerRef = useRef(null)      // google.maps.Marker instance
  const geocoderRef = useRef(null)    // google.maps.Geocoder instance
  const autocompleteServiceRef = useRef(null) // AutocompleteService
  const searchTimeoutRef = useRef(null)

  // Load Google Maps libraries once on mount
  useEffect(() => {
    Promise.all([
      importLibrary('maps'),
      importLibrary('places'),
      importLibrary('geocoding'),
    ])
      .then(() => setMapsReady(true))
      .catch((err) => console.error('Google Maps failed to load', err))
  }, [])

  // Initialise map after API is ready and the div is rendered
  useEffect(() => {
    if (!mapsReady || !mapRef.current || googleMapRef.current) return

    const center = form.latitude && form.longitude
      ? { lat: form.latitude, lng: form.longitude }
      : DEFAULT_CENTER
    const zoom = form.latitude && form.longitude ? 17 : DEFAULT_ZOOM

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    })

    // Place a marker if we already have a position (edit mode)
    if (form.latitude && form.longitude) {
      markerRef.current = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
      })
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current.getPosition()
        handlePositionChange(pos.lat(), pos.lng())
      })
    }

    // Click on map → move/create marker
    map.addListener('click', (e) => {
      handlePositionChange(e.latLng.lat(), e.latLng.lng(), map)
    })

    googleMapRef.current = map
    geocoderRef.current = new window.google.maps.Geocoder()
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady])

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

  // Extract city from Google address components — locality wins over sublocality/district
  const extractCity = (components) => {
    const get = (type) => components.find((c) => c.types.includes(type))?.long_name || ''
    return (
      get('locality') ||                      // e.g. Jalandhar, Delhi
      get('administrative_area_level_3') ||   // tehsil / taluka
      get('administrative_area_level_2') ||   // district
      get('sublocality_level_1') ||           // neighbourhood (last resort)
      ''
    )
  }

  // Build a clean address string: skip country and strip dupes
  const buildAddress = (formatted) => {
    if (!formatted) return ''
    const parts = formatted.split(',').map((p) => p.trim())
    // Drop last part if it's just "India"
    const filtered = parts.filter((p) => p.toLowerCase() !== 'india')
    return filtered.slice(0, 4).join(', ')
  }

  // Reverse geocode using Google Geocoding API
  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const components = results[0].address_components
        const get = (type) => components.find((c) => c.types.includes(type))?.long_name || ''
        setForm((prev) => ({
          ...prev,
          fullAddress: buildAddress(results[0].formatted_address) || prev.fullAddress,
          city: extractCity(components) || prev.city,
          state: get('administrative_area_level_1') || prev.state,
          pincode: get('postal_code') || prev.pincode,
        }))
      }
    })
  }, [])

  // Move / create marker and pan map to position
  const handlePositionChange = useCallback(
    (lat, lng, mapInstance) => {
      const map = mapInstance || googleMapRef.current
      if (!map) return

      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
      setErrors((prev) => ({ ...prev, location: '' }))

      const pos = { lat, lng }
      if (markerRef.current) {
        markerRef.current.setPosition(pos)
      } else {
        markerRef.current = new window.google.maps.Marker({
          position: pos,
          map,
          draggable: true,
        })
        markerRef.current.addListener('dragend', () => {
          const p = markerRef.current.getPosition()
          handlePositionChange(p.lat(), p.lng())
        })
      }
      map.panTo(pos)
      if (map.getZoom() < 15) map.setZoom(17)

      reverseGeocode(lat, lng)
    },
    [reverseGeocode]
  )

  // Places Autocomplete search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!query.trim() || query.length < 3) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current) return
      setSearching(true)
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' },
          types: ['geocode', 'establishment'],
        },
        (predictions, status) => {
          setSearching(false)
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSearchResults(predictions)
            setShowResults(true)
          } else {
            setSearchResults([])
          }
        }
      )
    }, 400)
  }, [])

  // Select a prediction → geocode to get lat/lng
  const selectSearchResult = (prediction) => {
    if (!geocoderRef.current) return
    setSearchQuery(prediction.description.split(',').slice(0, 2).join(', '))
    setShowResults(false)
    setSearchResults([])

    geocoderRef.current.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location
        const lat = loc.lat()
        const lng = loc.lng()
        const components = results[0].address_components
        const get = (type) => components.find((c) => c.types.includes(type))?.long_name || ''

        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          fullAddress: buildAddress(results[0].formatted_address) || prev.fullAddress,
          city: extractCity(components) || prev.city,
          state: get('administrative_area_level_1') || prev.state,
          pincode: get('postal_code') || prev.pincode,
        }))
        setErrors((prev) => ({ ...prev, location: '' }))

        // Update map
        const map = googleMapRef.current
        if (map) {
          const pos = { lat, lng }
          if (markerRef.current) {
            markerRef.current.setPosition(pos)
          } else {
            markerRef.current = new window.google.maps.Marker({
              position: pos,
              map,
              draggable: true,
            })
            markerRef.current.addListener('dragend', () => {
              const p = markerRef.current.getPosition()
              handlePositionChange(p.lat(), p.lng())
            })
          }
          map.panTo(pos)
          map.setZoom(17)
        }
      }
    })
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
        handlePositionChange(latitude, longitude)
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
            {searchResults.map((prediction, idx) => (
              <button
                key={prediction.place_id || idx}
                type="button"
                onClick={() => selectSearchResult(prediction)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <p className="text-sm text-gray-800 line-clamp-1">
                  {prediction.structured_formatting?.main_text || prediction.description.split(',')[0]}
                </p>
                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{prediction.description}</p>
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

      {/* Google Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        {!mapsReady ? (
          <div className="h-[220px] flex items-center justify-center bg-gray-50">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div ref={mapRef} style={{ height: '220px', width: '100%' }} />
        )}
        {form.latitude && form.longitude && (
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
