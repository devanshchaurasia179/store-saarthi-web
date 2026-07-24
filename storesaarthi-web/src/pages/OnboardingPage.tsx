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
  const [gstNumber, setGstNumber] = useState(shop?.gstNumber || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!shopName.trim() || !ownerName.trim() || !upiId.trim() || !addressStreet.trim()) {
      setError('Shop name, owner, UPI ID, and address are required to finish setup')
      return
    }

    setBusy(true)
    try {
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
