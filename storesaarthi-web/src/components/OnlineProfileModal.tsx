import { useCallback, useEffect, useState } from 'react'
import {
  fetchOnlineProfile,
  createOnlineProfile,
  updateOnlineProfile,
  toggleStoreStatus,
} from '../api/onlineProfile'
import type { OnlineProfile, OnlineProfilePayload } from '../api/onlineProfile'
import '../styles/online-profile-modal.css'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY_FORM: OnlineProfilePayload = {
  storeName: '',
  ownerName: '',
  storeDescription: '',
  mobileNumber: '',
  whatsappNumber: '',
  email: '',
  address: { street: '', city: '', state: '', pincode: '', latitude: null, longitude: null },
  deliveryCharges: 0,
  freeDeliveryAbove: 0,
  minimumOrderAmount: 0,
  deliveryRadius: 5,
  estimatedDeliveryTime: '',
  isOnlineOrderingEnabled: true,
  isDeliveryAvailable: true,
  isPickupAvailable: false,
  acceptedPaymentMethods: ['COD'],
  upiId: '',
  businessHours: { openTime: '09:00', closeTime: '21:00', offDays: [] },
  isStoreOnline: true,
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function OnlineProfileModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isNew, setIsNew] = useState(true)
  const [form, setForm] = useState<OnlineProfilePayload>({ ...EMPTY_FORM })
  const [locationLoading, setLocationLoading] = useState(false)
  // Track which fields were pre-filled from Shop model (greyed out / read-only)
  const [shopFields, setShopFields] = useState<Set<string>>(new Set())

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchOnlineProfile()
      if (res.profile) {
        // Use shop defaults for the greyed-out fields
        const d = res.defaults
        setForm({
          storeName: d?.storeName || res.profile.storeName || '',
          ownerName: d?.ownerName || res.profile.ownerName || '',
          storeDescription: res.profile.storeDescription || '',
          mobileNumber: d?.mobileNumber || res.profile.mobileNumber || '',
          whatsappNumber: res.profile.whatsappNumber || '',
          email: res.profile.email || '',
          address: {
            street: d?.address?.street || res.profile.address?.street || '',
            city: d?.address?.city || res.profile.address?.city || '',
            state: d?.address?.state || res.profile.address?.state || '',
            pincode: d?.address?.pincode || res.profile.address?.pincode || '',
            latitude: d?.address?.latitude ?? res.profile.address?.latitude ?? null,
            longitude: d?.address?.longitude ?? res.profile.address?.longitude ?? null,
          },
          deliveryCharges: res.profile.deliveryCharges || 0,
          freeDeliveryAbove: res.profile.freeDeliveryAbove || 0,
          minimumOrderAmount: res.profile.minimumOrderAmount || 0,
          deliveryRadius: res.profile.deliveryRadius || 5,
          estimatedDeliveryTime: res.profile.estimatedDeliveryTime || '',
          isOnlineOrderingEnabled: res.profile.isOnlineOrderingEnabled ?? true,
          isDeliveryAvailable: res.profile.isDeliveryAvailable ?? true,
          isPickupAvailable: res.profile.isPickupAvailable ?? false,
          acceptedPaymentMethods: res.profile.acceptedPaymentMethods || ['COD'],
          upiId: d?.upiId || res.profile.upiId || '',
          businessHours: res.profile.businessHours || { openTime: '09:00', closeTime: '21:00', offDays: [] },
          isStoreOnline: res.profile.isStoreOnline ?? true,
        })
        // Mark which fields have shop data
        const prefilled = new Set<string>()
        if (d?.storeName) prefilled.add('storeName')
        if (d?.ownerName) prefilled.add('ownerName')
        if (d?.mobileNumber) prefilled.add('mobileNumber')
        if (d?.upiId) prefilled.add('upiId')
        if (d?.address?.street) prefilled.add('address.street')
        if (d?.address?.city) prefilled.add('address.city')
        if (d?.address?.state) prefilled.add('address.state')
        if (d?.address?.pincode) prefilled.add('address.pincode')
        if (d?.address?.latitude != null) prefilled.add('address.latitude')
        if (d?.address?.longitude != null) prefilled.add('address.longitude')
        setShopFields(prefilled)
        setIsNew(false)
      } else {
        // Pre-fill from shop defaults so the user doesn't re-enter existing data
        const d = res.defaults
        const prefilled = new Set<string>()
        if (d?.storeName) prefilled.add('storeName')
        if (d?.ownerName) prefilled.add('ownerName')
        if (d?.mobileNumber) prefilled.add('mobileNumber')
        if (d?.upiId) prefilled.add('upiId')
        if (d?.address?.street) prefilled.add('address.street')
        if (d?.address?.city) prefilled.add('address.city')
        if (d?.address?.state) prefilled.add('address.state')
        if (d?.address?.pincode) prefilled.add('address.pincode')
        if (d?.address?.latitude != null) prefilled.add('address.latitude')
        if (d?.address?.longitude != null) prefilled.add('address.longitude')
        setShopFields(prefilled)
        setForm({
          ...EMPTY_FORM,
          storeName: d?.storeName || '',
          ownerName: d?.ownerName || '',
          mobileNumber: d?.mobileNumber || '',
          upiId: d?.upiId || '',
          address: d?.address || { street: '', city: '', state: '', pincode: '', latitude: null, longitude: null },
        })
        setIsNew(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadProfile()
  }, [open, loadProfile])

  function updateField<K extends keyof OnlineProfilePayload>(key: K, value: OnlineProfilePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateAddress(key: string, value: string | number | null) {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address!, [key]: value },
    }))
  }

  function updateBusinessHours(key: string, value: string | string[]) {
    setForm((prev) => ({
      ...prev,
      businessHours: { ...prev.businessHours!, [key]: value },
    }))
  }

  function togglePaymentMethod(method: string) {
    setForm((prev) => {
      const methods = prev.acceptedPaymentMethods || []
      if (methods.includes(method)) {
        return { ...prev, acceptedPaymentMethods: methods.filter((m) => m !== method) }
      }
      return { ...prev, acceptedPaymentMethods: [...methods, method] }
    })
  }

  function toggleOffDay(day: string) {
    setForm((prev) => {
      const days = prev.businessHours?.offDays || []
      if (days.includes(day)) {
        return {
          ...prev,
          businessHours: { ...prev.businessHours!, offDays: days.filter((d) => d !== day) },
        }
      }
      return {
        ...prev,
        businessHours: { ...prev.businessHours!, offDays: [...days, day] },
      }
    })
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLocationLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateAddress('latitude', position.coords.latitude)
        updateAddress('longitude', position.coords.longitude)
        setLocationLoading(false)
        setSuccessMsg('Location captured successfully')
        setTimeout(() => setSuccessMsg(''), 3000)
      },
      (err) => {
        setLocationLoading(false)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied. Please allow location access in browser settings.')
            break
          case err.POSITION_UNAVAILABLE:
            setError('Location information unavailable. Make sure GPS is enabled.')
            break
          case err.TIMEOUT:
            setError('Location request timed out. Please try again in an open area.')
            break
          default:
            setError('Failed to get location.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Force a fresh GPS fix, no cached position
      },
    )
  }

  async function handleSave() {
    if (!form.storeName?.trim()) {
      setError('Store name is required')
      return
    }
    if (!form.mobileNumber?.trim()) {
      setError('Mobile number is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (isNew) {
        await createOnlineProfile(form)
        setIsNew(false)
      } else {
        await updateOnlineProfile(form)
      }
      setSuccessMsg('Profile saved successfully')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    try {
      const res = await toggleStoreStatus()
      updateField('isStoreOnline', res.isStoreOnline)
      setSuccessMsg(res.message)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status')
    }
  }

  if (!open) return null

  return (
    <div className="opm-overlay" onClick={onClose}>
      <div className="opm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="opm-header">
          <h2 className="opm-title">Online Store Profile</h2>
          <button type="button" className="opm-close-btn" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        {error && <div className="opm-alert opm-alert--error">{error}</div>}
        {successMsg && <div className="opm-alert opm-alert--success">{successMsg}</div>}

        {loading ? (
          <div className="opm-loading">
            <div className="opm-loading-spinner" />
            <p>Loading profile…</p>
          </div>
        ) : (
          <div className="opm-body">
            {/* Store Status Toggle */}
            {!isNew && (
              <div className="opm-status-bar">
                <span className={`opm-status-dot ${form.isStoreOnline ? 'opm-status-dot--online' : 'opm-status-dot--offline'}`} />
                <span className="opm-status-text">
                  Store is {form.isStoreOnline ? 'Online' : 'Offline'}
                </span>
                <button type="button" className="opm-toggle-btn" onClick={handleToggleStatus}>
                  {form.isStoreOnline ? 'Go Offline' : 'Go Online'}
                </button>
              </div>
            )}

            {/* Section: Store Info */}
            <fieldset className="opm-section">
              <legend className="opm-section-title">Store Information</legend>
              <div className="opm-grid">
                <div className="opm-field">
                  <label className="opm-label">Store Name *</label>
                  <input
                    className={`opm-input${shopFields.has('storeName') ? ' opm-input--from-shop' : ''}`}
                    value={form.storeName || ''}
                    onChange={(e) => { if (!shopFields.has('storeName')) updateField('storeName', e.target.value) }}
                    placeholder="Your store name"
                    readOnly={shopFields.has('storeName')}
                    tabIndex={shopFields.has('storeName') ? -1 : undefined}
                  />
                  {shopFields.has('storeName') && <span className="opm-field-hint">From your shop settings</span>}
                </div>
                <div className="opm-field">
                  <label className="opm-label">Owner Name</label>
                  <input
                    className={`opm-input${shopFields.has('ownerName') ? ' opm-input--from-shop' : ''}`}
                    value={form.ownerName || ''}
                    onChange={(e) => { if (!shopFields.has('ownerName')) updateField('ownerName', e.target.value) }}
                    placeholder="Owner name"
                    readOnly={shopFields.has('ownerName')}
                    tabIndex={shopFields.has('ownerName') ? -1 : undefined}
                  />
                  {shopFields.has('ownerName') && <span className="opm-field-hint">From your shop settings</span>}
                </div>
              </div>
              <div className="opm-field">
                <label className="opm-label">Store Description</label>
                <textarea
                  className="opm-textarea"
                  value={form.storeDescription || ''}
                  onChange={(e) => updateField('storeDescription', e.target.value)}
                  placeholder="Brief description of your store"
                  rows={3}
                />
              </div>
            </fieldset>

            {/* Section: Contact */}
            <fieldset className="opm-section">
              <legend className="opm-section-title">Contact Details</legend>
              <div className="opm-grid opm-grid--3">
                <div className="opm-field">
                  <label className="opm-label">Mobile Number *</label>
                  <input
                    className={`opm-input${shopFields.has('mobileNumber') ? ' opm-input--from-shop' : ''}`}
                    value={form.mobileNumber || ''}
                    onChange={(e) => { if (!shopFields.has('mobileNumber')) updateField('mobileNumber', e.target.value) }}
                    placeholder="10-digit mobile"
                    readOnly={shopFields.has('mobileNumber')}
                    tabIndex={shopFields.has('mobileNumber') ? -1 : undefined}
                  />
                  {shopFields.has('mobileNumber') && <span className="opm-field-hint">From your shop settings</span>}
                </div>
                <div className="opm-field">
                  <label className="opm-label">WhatsApp Number</label>
                  <input
                    className="opm-input"
                    value={form.whatsappNumber || ''}
                    onChange={(e) => updateField('whatsappNumber', e.target.value)}
                    placeholder="WhatsApp number"
                  />
                </div>
                <div className="opm-field">
                  <label className="opm-label">Email</label>
                  <input
                    className="opm-input"
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="store@example.com"
                  />
                </div>
              </div>
            </fieldset>

            {/* Section: Address & Location */}
            <fieldset className="opm-section">
              <legend className="opm-section-title">Address & Location</legend>
              <div className="opm-grid">
                <div className="opm-field">
                  <label className="opm-label">Street</label>
                  <input
                    className={`opm-input${shopFields.has('address.street') ? ' opm-input--from-shop' : ''}`}
                    value={form.address?.street || ''}
                    onChange={(e) => { if (!shopFields.has('address.street')) updateAddress('street', e.target.value) }}
                    placeholder="Street address"
                    readOnly={shopFields.has('address.street')}
                    tabIndex={shopFields.has('address.street') ? -1 : undefined}
                  />
                  {shopFields.has('address.street') && <span className="opm-field-hint">From your shop settings</span>}
                </div>
                <div className="opm-field">
                  <label className="opm-label">City</label>
                  <input
                    className={`opm-input${shopFields.has('address.city') ? ' opm-input--from-shop' : ''}`}
                    value={form.address?.city || ''}
                    onChange={(e) => { if (!shopFields.has('address.city')) updateAddress('city', e.target.value) }}
                    placeholder="City"
                    readOnly={shopFields.has('address.city')}
                    tabIndex={shopFields.has('address.city') ? -1 : undefined}
                  />
                  {shopFields.has('address.city') && <span className="opm-field-hint">From your shop settings</span>}
                </div>
              </div>
              <div className="opm-grid opm-grid--3">
                <div className="opm-field">
                  <label className="opm-label">State</label>
                  <input
                    className={`opm-input${shopFields.has('address.state') ? ' opm-input--from-shop' : ''}`}
                    value={form.address?.state || ''}
                    onChange={(e) => { if (!shopFields.has('address.state')) updateAddress('state', e.target.value) }}
                    placeholder="State"
                    readOnly={shopFields.has('address.state')}
                    tabIndex={shopFields.has('address.state') ? -1 : undefined}
                  />
                  {shopFields.has('address.state') && <span className="opm-field-hint">From your shop settings</span>}
                </div>
                <div className="opm-field">
                  <label className="opm-label">Pincode</label>
                  <input
                    className={`opm-input${shopFields.has('address.pincode') ? ' opm-input--from-shop' : ''}`}
                    value={form.address?.pincode || ''}
                    onChange={(e) => { if (!shopFields.has('address.pincode')) updateAddress('pincode', e.target.value) }}
                    placeholder="Pincode"
                    readOnly={shopFields.has('address.pincode')}
                    tabIndex={shopFields.has('address.pincode') ? -1 : undefined}
                  />
                  {shopFields.has('address.pincode') && <span className="opm-field-hint">From your shop settings</span>}
                </div>
                <div className="opm-field">
                  <label className="opm-label">UPI ID</label>
                  <input
                    className={`opm-input${shopFields.has('upiId') ? ' opm-input--from-shop' : ''}`}
                    value={form.upiId || ''}
                    onChange={(e) => { if (!shopFields.has('upiId')) updateField('upiId', e.target.value) }}
                    placeholder="name@upi"
                    readOnly={shopFields.has('upiId')}
                    tabIndex={shopFields.has('upiId') ? -1 : undefined}
                  />
                  {shopFields.has('upiId') && <span className="opm-field-hint">From your shop settings</span>}
                </div>
              </div>

              {/* Location Capture */}
              <div className="opm-location-row">
                <div className="opm-location-fields">
                  <div className="opm-field opm-field--small">
                    <label className="opm-label">Latitude</label>
                    <input
                      className={`opm-input${shopFields.has('address.latitude') ? ' opm-input--from-shop' : ''}`}
                      type="number"
                      step="any"
                      value={form.address?.latitude ?? ''}
                      onChange={(e) => { if (!shopFields.has('address.latitude')) updateAddress('latitude', e.target.value ? Number(e.target.value) : null) }}
                      placeholder="e.g. 28.6139"
                      readOnly={shopFields.has('address.latitude')}
                      tabIndex={shopFields.has('address.latitude') ? -1 : undefined}
                    />
                    {shopFields.has('address.latitude') && <span className="opm-field-hint">From your shop settings</span>}
                  </div>
                  <div className="opm-field opm-field--small">
                    <label className="opm-label">Longitude</label>
                    <input
                      className={`opm-input${shopFields.has('address.longitude') ? ' opm-input--from-shop' : ''}`}
                      type="number"
                      step="any"
                      value={form.address?.longitude ?? ''}
                      onChange={(e) => { if (!shopFields.has('address.longitude')) updateAddress('longitude', e.target.value ? Number(e.target.value) : null) }}
                      placeholder="e.g. 77.2090"
                      readOnly={shopFields.has('address.longitude')}
                      tabIndex={shopFields.has('address.longitude') ? -1 : undefined}
                    />
                    {shopFields.has('address.longitude') && <span className="opm-field-hint">From your shop settings</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="opm-location-btn"
                  onClick={captureLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <span className="opm-location-btn__spinner" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                    </svg>
                  )}
                  {locationLoading ? 'Detecting…' : 'Capture Location'}
                </button>
              </div>
              {form.address?.latitude && form.address?.longitude && (
                <p className="opm-location-info">
                  📍 {form.address.latitude.toFixed(6)}, {form.address.longitude.toFixed(6)}
                </p>
              )}
            </fieldset>

            {/* Section: Delivery Settings */}
            <fieldset className="opm-section">
              <legend className="opm-section-title">Delivery Settings</legend>
              <div className="opm-grid opm-grid--4">
                <div className="opm-field">
                  <label className="opm-label">Delivery Charges (₹)</label>
                  <input
                    className="opm-input"
                    type="number"
                    min="0"
                    value={form.deliveryCharges || 0}
                    onChange={(e) => updateField('deliveryCharges', Number(e.target.value))}
                  />
                </div>
                <div className="opm-field">
                  <label className="opm-label">Free Delivery Above (₹)</label>
                  <input
                    className="opm-input"
                    type="number"
                    min="0"
                    value={form.freeDeliveryAbove || 0}
                    onChange={(e) => updateField('freeDeliveryAbove', Number(e.target.value))}
                  />
                </div>
                <div className="opm-field">
                  <label className="opm-label">Min Order (₹)</label>
                  <input
                    className="opm-input"
                    type="number"
                    min="0"
                    value={form.minimumOrderAmount || 0}
                    onChange={(e) => updateField('minimumOrderAmount', Number(e.target.value))}
                  />
                </div>
                <div className="opm-field">
                  <label className="opm-label">Delivery Radius (km)</label>
                  <input
                    className="opm-input"
                    type="number"
                    min="0"
                    value={form.deliveryRadius || 5}
                    onChange={(e) => updateField('deliveryRadius', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="opm-field">
                <label className="opm-label">Estimated Delivery Time</label>
                <input
                  className="opm-input"
                  value={form.estimatedDeliveryTime || ''}
                  onChange={(e) => updateField('estimatedDeliveryTime', e.target.value)}
                  placeholder="e.g. 30-45 mins"
                />
              </div>

              <div className="opm-toggles">
                <label className="opm-toggle-item">
                  <input
                    type="checkbox"
                    checked={form.isDeliveryAvailable ?? true}
                    onChange={(e) => updateField('isDeliveryAvailable', e.target.checked)}
                  />
                  <span>Delivery Available</span>
                </label>
                <label className="opm-toggle-item">
                  <input
                    type="checkbox"
                    checked={form.isPickupAvailable ?? false}
                    onChange={(e) => updateField('isPickupAvailable', e.target.checked)}
                  />
                  <span>Pickup Available</span>
                </label>
                <label className="opm-toggle-item">
                  <input
                    type="checkbox"
                    checked={form.isOnlineOrderingEnabled ?? true}
                    onChange={(e) => updateField('isOnlineOrderingEnabled', e.target.checked)}
                  />
                  <span>Online Ordering Enabled</span>
                </label>
              </div>
            </fieldset>

            {/* Section: Payment */}
            <fieldset className="opm-section">
              <legend className="opm-section-title">Payment Methods</legend>
              <div className="opm-chip-group">
                {['COD', 'UPI', 'ONLINE'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`opm-chip ${(form.acceptedPaymentMethods || []).includes(method) ? 'opm-chip--active' : ''}`}
                    onClick={() => togglePaymentMethod(method)}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Section: Business Hours */}
            <fieldset className="opm-section">
              <legend className="opm-section-title">Business Hours</legend>
              <div className="opm-grid">
                <div className="opm-field">
                  <label className="opm-label">Open Time</label>
                  <input
                    className="opm-input"
                    type="time"
                    value={form.businessHours?.openTime || '09:00'}
                    onChange={(e) => updateBusinessHours('openTime', e.target.value)}
                  />
                </div>
                <div className="opm-field">
                  <label className="opm-label">Close Time</label>
                  <input
                    className="opm-input"
                    type="time"
                    value={form.businessHours?.closeTime || '21:00'}
                    onChange={(e) => updateBusinessHours('closeTime', e.target.value)}
                  />
                </div>
              </div>
              <div className="opm-field">
                <label className="opm-label">Off Days</label>
                <div className="opm-chip-group">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`opm-chip ${(form.businessHours?.offDays || []).includes(day) ? 'opm-chip--active' : ''}`}
                      onClick={() => toggleOffDay(day)}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="opm-footer">
            <button type="button" className="opm-btn opm-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="opm-btn opm-btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : isNew ? 'Create Profile' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
