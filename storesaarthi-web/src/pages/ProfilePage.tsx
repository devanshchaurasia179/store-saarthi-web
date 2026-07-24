import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'

const CATEGORIES = ['Kirana', 'General Store', 'Pharmacy', 'Electronics', 'Fashion', 'Other']

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function ProfilePage() {
  const { shop, refreshShop } = useAuth()
  const { saving, saveError, saveSuccess, clearSaveStatus, updateShopProfile } = useProfile()

  const [shopName, setShopName] = useState(shop?.shopName ?? '')
  const [ownerName, setOwnerName] = useState(shop?.ownerName ?? '')
  const [storeCategory, setStoreCategory] = useState(shop?.storeCategory ?? 'Kirana')
  const [upiId, setUpiId] = useState(shop?.upiId ?? '')
  const [addressStreet, setAddressStreet] = useState(shop?.address?.street ?? '')
  const [addressCity, setAddressCity] = useState(shop?.address?.city ?? '')
  const [addressState, setAddressState] = useState(shop?.address?.state ?? '')
  const [addressPincode, setAddressPincode] = useState(shop?.address?.pincode ?? '')
  const [latitude, setLatitude] = useState<string>(shop?.address?.latitude?.toString() ?? '')
  const [longitude, setLongitude] = useState<string>(shop?.address?.longitude?.toString() ?? '')
  const [gstNumber, setGstNumber] = useState(shop?.gstNumber ?? '')
  const [editing, setEditing] = useState(false)
  const [fetchingLocation, setFetchingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    if (!shop) return
    setShopName(shop.shopName ?? '')
    setOwnerName(shop.ownerName ?? '')
    setStoreCategory(shop.storeCategory ?? 'Kirana')
    setUpiId(shop.upiId ?? '')
    setAddressStreet(shop.address?.street ?? '')
    setAddressCity(shop.address?.city ?? '')
    setAddressState(shop.address?.state ?? '')
    setAddressPincode(shop.address?.pincode ?? '')
    setLatitude(shop.address?.latitude?.toString() ?? '')
    setLongitude(shop.address?.longitude?.toString() ?? '')
    setGstNumber(shop.gstNumber ?? '')
  }, [shop])

  function handleCancel() {
    setShopName(shop?.shopName ?? '')
    setOwnerName(shop?.ownerName ?? '')
    setStoreCategory(shop?.storeCategory ?? 'Kirana')
    setUpiId(shop?.upiId ?? '')
    setAddressStreet(shop?.address?.street ?? '')
    setAddressCity(shop?.address?.city ?? '')
    setAddressState(shop?.address?.state ?? '')
    setAddressPincode(shop?.address?.pincode ?? '')
    setLatitude(shop?.address?.latitude?.toString() ?? '')
    setLongitude(shop?.address?.longitude?.toString() ?? '')
    setGstNumber(shop?.gstNumber ?? '')
    setEditing(false)
    clearSaveStatus()
  }

  /** Attempt to get the browser's current GPS position with high accuracy */
  function captureLocation(): Promise<{ lat: string; lng: string } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser')
        resolve(null)
        return
      }
      setFetchingLocation(true)
      setLocationError('')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(7)
          const lng = pos.coords.longitude.toFixed(7)
          setLatitude(lat)
          setLongitude(lng)
          setFetchingLocation(false)
          resolve({ lat, lng })
        },
        (err) => {
          setFetchingLocation(false)
          setLocationError(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Please allow location access in browser settings.'
              : err.code === err.TIMEOUT
                ? 'Location request timed out. Please try again in an open area.'
                : 'Unable to fetch location. Make sure GPS is enabled.'
          )
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // Force a fresh GPS fix, no cached position
        }
      )
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearSaveStatus()

    // Auto-capture location before saving
    const captured = await captureLocation()
    const finalLat = captured?.lat ?? latitude.trim()
    const finalLng = captured?.lng ?? longitude.trim()

    try {
      await updateShopProfile({
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
      await refreshShop()
      setEditing(false)
    } catch {
      // surfaced via saveError
    }
  }

  const initials = shop?.ownerName ? getInitials(shop.ownerName) : '?'
  const memberSince = shop?.createdAt
    ? new Date(shop.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
    : null

  return (
    <DashboardLayout>
      <main className="profile-page">
        {/* Page header */}
        <div className="profile-page__header">
          <div>
            <h1 className="profile-page__title">My Profile</h1>
            <p className="profile-page__subtitle">Manage your shop details and account</p>
          </div>
          {!editing && (
            <button
              type="button"
              className="profile-edit-btn"
              onClick={() => { clearSaveStatus(); setEditing(true) }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {/* Hero / Avatar card */}
        <div className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="profile-hero__info">
            <h2 className="profile-hero__name">{shop?.ownerName ?? '—'}</h2>
            <p className="profile-hero__shop">{shop?.shopName ?? '—'}</p>
            {memberSince && (
              <p className="profile-hero__since">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Member since {memberSince}
              </p>
            )}
          </div>
          {shop?.storeCategory && (
            <span className="profile-hero__badge">{shop.storeCategory}</span>
          )}
        </div>

        {/* Success banner */}
        {saveSuccess && !editing && (
          <div className="profile-banner profile-banner--success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Profile updated successfully
          </div>
        )}

        {/* Content grid */}
        <div className={`profile-grid ${editing ? 'profile-grid--full' : ''}`}>
          {/* Shop details — view or edit */}
          {editing ? (
            <div className="profile-card profile-card--wide">
              <div className="profile-card__header">
                <h3 className="profile-card__title">Edit Shop Details</h3>
              </div>
              <form onSubmit={(e) => void handleSubmit(e)} noValidate>
                <div className="profile-form-grid">
                  {/* Shop name */}
                  <label className="profile-label">
                    <span>Shop name</span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <input
                        className="profile-input"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="e.g. Shyam Kirana"
                        disabled={saving}
                        required
                      />
                    </div>
                  </label>

                  {/* Owner name */}
                  <label className="profile-label">
                    <span>Owner name</span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      <input
                        className="profile-input"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Your full name"
                        disabled={saving}
                        required
                      />
                    </div>
                  </label>

                  {/* Category */}
                  <label className="profile-label">
                    <span>Store category</span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      <select
                        className="profile-input profile-input--select"
                        value={storeCategory}
                        onChange={(e) => setStoreCategory(e.target.value)}
                        disabled={saving}
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </label>

                  {/* UPI ID */}
                  <label className="profile-label">
                    <span>UPI ID</span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      <input
                        className="profile-input"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="shop@upi"
                        disabled={saving}
                      />
                    </div>
                  </label>

                  {/* Address */}
                  <label className="profile-label">
                    <span>Street / Area</span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <input
                        className="profile-input"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        placeholder="Street / area"
                        disabled={saving}
                      />
                    </div>
                  </label>

                  {/* City */}
                  <label className="profile-label">
                    <span>City</span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <input
                        className="profile-input"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        placeholder="City"
                        disabled={saving}
                      />
                    </div>
                  </label>

                  {/* State */}
                  <label className="profile-label">
                    <span>State</span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <input
                        className="profile-input"
                        value={addressState}
                        onChange={(e) => setAddressState(e.target.value)}
                        placeholder="State"
                        disabled={saving}
                      />
                    </div>
                  </label>

                  {/* Pincode */}
                  <label className="profile-label">
                    <span>Pincode</span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <input
                        className="profile-input"
                        value={addressPincode}
                        onChange={(e) => setAddressPincode(e.target.value)}
                        placeholder="Pincode"
                        disabled={saving}
                      />
                    </div>
                  </label>

                  {/* Latitude & Longitude — auto-captured */}
                  <label className="profile-label profile-label--full">
                    <span>Location (auto-detected on save)</span>
                    <div className="profile-input-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <input
                        className="profile-input"
                        readOnly
                        value={
                          latitude && longitude
                            ? `${latitude}, ${longitude}`
                            : fetchingLocation
                              ? 'Detecting…'
                              : 'Will be captured on save'
                        }
                        disabled={saving}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="profile-btn profile-btn--ghost"
                        style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '13px' }}
                        disabled={saving || fetchingLocation}
                        onClick={() => void captureLocation()}
                      >
                        {fetchingLocation ? 'Detecting…' : '📍 Detect Now'}
                      </button>
                    </div>
                    {locationError && (
                      <span style={{ color: 'var(--color-error, #e53e3e)', fontSize: '12px', marginTop: '4px' }}>
                        {locationError}
                      </span>
                    )}
                  </label>

                  {/* GST */}
                  <label className="profile-label">
                    <span>GST number <span className="profile-label__opt">(optional)</span></span>
                    <div className="profile-input-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="profile-input-icon">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" />
                      </svg>
                      <input
                        className="profile-input"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                        placeholder="22AAAAA0000A1Z5"
                        disabled={saving}
                      />
                    </div>
                  </label>
                </div>

                {saveError && (
                  <div className="profile-banner profile-banner--error" style={{ margin: '0 24px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {saveError}
                  </div>
                )}

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="profile-btn profile-btn--ghost"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="profile-btn profile-btn--primary"
                    disabled={saving || fetchingLocation}
                  >
                    {fetchingLocation ? 'Detecting location…' : saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="profile-card">
              <div className="profile-card__header">
                <h3 className="profile-card__title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  Shop Details
                </h3>
              </div>
              <div className="profile-info-list">
                <div className="profile-info-row">
                  <span className="profile-info-row__label">Shop name</span>
                  <span className="profile-info-row__value">{shop?.shopName || '—'}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-row__label">Owner name</span>
                  <span className="profile-info-row__value">{shop?.ownerName || '—'}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-row__label">Category</span>
                  <span className="profile-info-row__value">{shop?.storeCategory || '—'}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-row__label">UPI ID</span>
                  <span className="profile-info-row__value">{shop?.upiId || '—'}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-row__label">Address</span>
                  <span className="profile-info-row__value">
                    {[shop?.address?.street, shop?.address?.city, shop?.address?.state, shop?.address?.pincode]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-row__label">Coordinates</span>
                  <span className="profile-info-row__value">
                    {shop?.address?.latitude != null && shop?.address?.longitude != null
                      ? `${shop.address.latitude}, ${shop.address.longitude}`
                      : '—'}
                  </span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-row__label">GST number</span>
                  <span className="profile-info-row__value">{shop?.gstNumber || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Account info — always read-only */}
          {!editing && (
            <div className="profile-card">
              <div className="profile-card__header">
                <h3 className="profile-card__title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  Account Info
                </h3>
              </div>
              <div className="profile-info-list">
                <div className="profile-info-row">
                  <span className="profile-info-row__label">Account ID</span>
                  <span className="profile-info-row__value profile-info-row__value--mono">{shop?._id || '—'}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-row__label">Onboarded</span>
                  <span className="profile-info-row__value">
                    {shop?.isOnboarded ? (
                      <span className="profile-status profile-status--yes">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Yes
                      </span>
                    ) : 'No'}
                  </span>
                </div>
                {memberSince && (
                  <div className="profile-info-row">
                    <span className="profile-info-row__label">Member since</span>
                    <span className="profile-info-row__value">{memberSince}</span>
                  </div>
                )}
                {shop?.updatedAt && (
                  <div className="profile-info-row">
                    <span className="profile-info-row__label">Last updated</span>
                    <span className="profile-info-row__value">
                      {new Date(shop.updatedAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Print Agent shortcut */}
        {!editing && (
          <div className="profile-card profile-card--action">
            <div className="profile-action-row">
              <div className="profile-action-row__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
              </div>
              <div className="profile-action-row__content">
                <p className="profile-action-row__title">Print Agent</p>
                <p className="profile-action-row__desc">Configure and manage your thermal printer connection</p>
              </div>
              <Link to="/print-agent" className="profile-btn profile-btn--ghost">
                Open
              </Link>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
