import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['Kirana', 'General Store', 'Pharmacy', 'Electronics', 'Fashion', 'Other']

export function OnboardingPage() {
  const { shop, saveOnboarding } = useAuth()
  const navigate = useNavigate()

  const [shopName, setShopName] = useState(
    shop?.shopName && shop.shopName !== 'My Shop' ? shop.shopName : '',
  )
  const [ownerName, setOwnerName] = useState(
    shop?.ownerName && shop.ownerName !== 'Owner' ? shop.ownerName : '',
  )
  const [storeCategory, setStoreCategory] = useState(shop?.storeCategory || 'Kirana')
  const [upiId, setUpiId] = useState(shop?.upiId || '')
  const [addressStreet, setAddressStreet] = useState(shop?.address?.street || '')
  const [addressCity, setAddressCity] = useState(shop?.address?.city || '')
  const [addressState, setAddressState] = useState(shop?.address?.state || '')
  const [addressPincode, setAddressPincode] = useState(shop?.address?.pincode || '')
  const [latitude, setLatitude] = useState<string>(shop?.address?.latitude?.toString() || '')
  const [longitude, setLongitude] = useState<string>(shop?.address?.longitude?.toString() || '')
  const [gstNumber, setGstNumber] = useState(shop?.gstNumber || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fetchingLocation, setFetchingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')

  /**
   * Uses watchPosition to collect multiple GPS readings and picks the most
   * accurate one (lowest coords.accuracy). Stops after getting a reading
   * with ≤30m accuracy OR after 20 seconds, whichever comes first.
   */
  function captureLocation(): Promise<{ lat: string; lng: string } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser')
        resolve(null)
        return
      }
      setFetchingLocation(true)
      setLocationError('')

      const ACCURACY_THRESHOLD = 30 // meters — good enough for a shop address
      const MAX_WAIT = 20000 // 20 seconds max

      let bestPosition: GeolocationPosition | null = null
      let watchId: number | null = null

      function finish() {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId)
        if (bestPosition) {
          const lat = bestPosition.coords.latitude.toFixed(7)
          const lng = bestPosition.coords.longitude.toFixed(7)
          setLatitude(lat)
          setLongitude(lng)
          setFetchingLocation(false)
          resolve({ lat, lng })
        } else {
          setFetchingLocation(false)
          setLocationError('Could not get an accurate location. Try again in an open area.')
          resolve(null)
        }
      }

      // Timeout fallback — use the best reading we have so far
      const timer = setTimeout(finish, MAX_WAIT)

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          // Keep the most accurate reading
          if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = pos
            // Update UI in real-time so user sees progress
            setLatitude(pos.coords.latitude.toFixed(7))
            setLongitude(pos.coords.longitude.toFixed(7))
          }
          // If accuracy is good enough, stop early
          if (pos.coords.accuracy <= ACCURACY_THRESHOLD) {
            clearTimeout(timer)
            finish()
          }
        },
        (err) => {
          clearTimeout(timer)
          if (watchId !== null) navigator.geolocation.clearWatch(watchId)
          setFetchingLocation(false)
          setLocationError(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Please allow location access.'
              : err.code === err.TIMEOUT
                ? 'Location request timed out. Try again in an open area.'
                : 'Unable to fetch location. Make sure GPS is enabled.',
          )
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: MAX_WAIT, maximumAge: 0 },
      )
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!shopName.trim() || !ownerName.trim() || !upiId.trim() || !addressStreet.trim()) {
      setError('Shop name, owner, UPI ID, and address are required to finish setup')
      return
    }

    setBusy(true)
    try {
      // Auto-capture location before saving
      const captured = await captureLocation()
      const finalLat = captured?.lat ?? latitude.trim()
      const finalLng = captured?.lng ?? longitude.trim()

      const updated = await saveOnboarding({
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        storeCategory,
        upiId: upiId.trim(),
        address: {
          street: addressStreet.trim(),
          city: addressCity.trim(),
          state: addressState.trim(),
          pincode: addressPincode.trim(),
          latitude: finalLat ? parseFloat(finalLat) : null,
          longitude: finalLng ? parseFloat(finalLng) : null,
        },
        gstNumber: gstNumber.trim(),
      })
      if (updated.isOnboarded) {
        navigate('/', { replace: true })
      } else {
        setError('Please fill all shop details to continue')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save profile')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell auth-shell--form">
      <div className="auth-panel auth-panel--wide">
        <header className="auth-panel__header">
          <p className="auth-panel__brand">StoreSaarthi</p>
          <h1>Set up your shop</h1>
          <p className="auth-panel__sub">
            Tell us a bit about the store so billing and ledgers feel like home.
          </p>
        </header>

        <form className="auth-form auth-form--grid" onSubmit={handleSubmit}>
          <label>
            Shop name
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Shyam Kirana"
              disabled={busy}
              required
            />
          </label>
          <label>
            Owner name
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Your name"
              disabled={busy}
              required
            />
          </label>
          <label>
            Category
            <select
              value={storeCategory}
              onChange={(e) => setStoreCategory(e.target.value)}
              disabled={busy}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            UPI ID
            <input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="shop@upi"
              disabled={busy}
              required
            />
          </label>
          <label>
            Street / Area
            <input
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
              placeholder="Street / area"
              disabled={busy}
              required
            />
          </label>
          <label>
            City
            <input
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              placeholder="City"
              disabled={busy}
            />
          </label>
          <label>
            State
            <input
              value={addressState}
              onChange={(e) => setAddressState(e.target.value)}
              placeholder="State"
              disabled={busy}
            />
          </label>
          <label>
            Pincode
            <input
              value={addressPincode}
              onChange={(e) => setAddressPincode(e.target.value)}
              placeholder="Pincode"
              disabled={busy}
            />
          </label>
          <label>
            Latitude
            <input
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Auto-captured"
              disabled={busy}
              readOnly
            />
          </label>
          <label>
            Longitude
            <input
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Auto-captured"
              disabled={busy}
              readOnly
            />
          </label>
          <div className="auth-form__location-row">
            <button
              type="button"
              className="auth-btn auth-btn--secondary"
              onClick={() => captureLocation()}
              disabled={busy || fetchingLocation}
            >
              {fetchingLocation ? 'Fetching…' : '📍 Capture Location'}
            </button>
            {locationError && <p className="auth-msg auth-msg--error">{locationError}</p>}
          </div>
          <label>
            GST number (optional)
            <input
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              disabled={busy}
            />
          </label>

          <button type="submit" className="auth-btn auth-btn--span" disabled={busy}>
            {busy ? 'Saving…' : 'Continue to dashboard'}
          </button>
        </form>

        {error && <p className="auth-msg auth-msg--error">{error}</p>}
      </div>
    </div>
  )
}
