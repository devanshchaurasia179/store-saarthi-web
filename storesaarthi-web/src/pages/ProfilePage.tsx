import { type FormEvent, useEffect, useState } from 'react'
import {
  Store,
  User,
  MapPin,
  CreditCard,
  Building2,
  Tag,
  Edit2,
  Calendar,
  Hash,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { Button, Card, Alert } from '../components/ui'

const CATEGORIES = ['Kirana', 'General Store', 'Pharmacy', 'Electronics', 'Fashion', 'Other']

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

type InfoRowProps = { icon: React.ReactNode; label: string; value?: string }

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <span className="text-muted shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-xs text-muted">{label}</p>
        <p className="font-heading text-sm font-medium text-heading truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

const inputCls =
  'w-full h-12 rounded-xl border border-border bg-surface font-body text-base text-heading px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted/60 disabled:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed'

export function ProfilePage() {
  const { shop, refreshShop } = useAuth()
  const { saving, saveError, saveSuccess, clearSaveStatus, updateShopProfile } = useProfile()

  const [shopName, setShopName] = useState(shop?.shopName ?? '')
  const [ownerName, setOwnerName] = useState(shop?.ownerName ?? '')
  const [storeCategory, setStoreCategory] = useState(shop?.storeCategory ?? 'Kirana')
  const [upiId, setUpiId] = useState(shop?.upiId ?? '')
  const [location, setLocation] = useState(shop?.location ?? '')
  const [gstNumber, setGstNumber] = useState(shop?.gstNumber ?? '')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!shop) return
    setShopName(shop.shopName ?? '')
    setOwnerName(shop.ownerName ?? '')
    setStoreCategory(shop.storeCategory ?? 'Kirana')
    setUpiId(shop.upiId ?? '')
    setLocation(shop.location ?? '')
    setGstNumber(shop.gstNumber ?? '')
  }, [shop])

  function handleCancel() {
    setShopName(shop?.shopName ?? '')
    setOwnerName(shop?.ownerName ?? '')
    setStoreCategory(shop?.storeCategory ?? 'Kirana')
    setUpiId(shop?.upiId ?? '')
    setLocation(shop?.location ?? '')
    setGstNumber(shop?.gstNumber ?? '')
    setEditing(false)
    clearSaveStatus()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearSaveStatus()
    try {
      await updateShopProfile({
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        storeCategory,
        upiId: upiId.trim(),
        location: location.trim(),
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
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-heading">My Profile</h1>
          <p className="font-body text-sm text-muted mt-1">Manage your shop details and account</p>
        </div>
        {!editing && (
          <Button
            variant="ghost"
            icon={<Edit2 size={15} strokeWidth={2} />}
            onClick={() => { clearSaveStatus(); setEditing(true) }}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {/* Hero / Avatar card */}
      <Card className="mb-5">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl bg-[#0F1F4B] flex items-center justify-center font-display text-xl font-bold text-white shrink-0"
            aria-hidden
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-xl font-semibold text-heading truncate">
              {shop?.ownerName ?? '—'}
            </p>
            <p className="font-heading text-sm font-medium text-muted truncate">
              {shop?.shopName ?? '—'}
            </p>
            {memberSince && (
              <p className="font-body text-xs text-muted mt-0.5 flex items-center gap-1.5">
                <Calendar size={12} strokeWidth={2} />
                Member since {memberSince}
              </p>
            )}
          </div>
          {shop?.storeCategory && (
            <span className="hidden sm:block bg-primary-soft text-primary text-xs font-heading font-medium px-2.5 py-1 rounded-full border border-primary/20 shrink-0">
              {shop.storeCategory}
            </span>
          )}
        </div>
      </Card>

      {/* Success banner */}
      {saveSuccess && !editing && (
        <Alert variant="success" className="mb-5">
          <CheckCircle2 size={15} strokeWidth={2} className="shrink-0" />
          Profile updated successfully
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shop details — view or edit */}
        {editing ? (
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <p className="font-heading text-base font-semibold text-heading">Edit Shop Details</p>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                {/* Shop name */}
                <div>
                  <label className="block font-heading text-sm font-medium text-body mb-1.5">
                    Shop name
                  </label>
                  <div className="relative">
                    <Store size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Shyam Kirana"
                      disabled={saving}
                      required
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>

                {/* Owner name */}
                <div>
                  <label className="block font-heading text-sm font-medium text-body mb-1.5">
                    Owner name
                  </label>
                  <div className="relative">
                    <User size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Your full name"
                      disabled={saving}
                      required
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block font-heading text-sm font-medium text-body mb-1.5">
                    Store category
                  </label>
                  <div className="relative">
                    <Tag size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <select
                      value={storeCategory}
                      onChange={(e) => setStoreCategory(e.target.value)}
                      disabled={saving}
                      className={`${inputCls} pl-10 appearance-none`}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* UPI ID */}
                <div>
                  <label className="block font-heading text-sm font-medium text-body mb-1.5">
                    UPI ID
                  </label>
                  <div className="relative">
                    <CreditCard size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="shop@upi"
                      disabled={saving}
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block font-heading text-sm font-medium text-body mb-1.5">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City / area"
                      disabled={saving}
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>

                {/* GST */}
                <div>
                  <label className="block font-heading text-sm font-medium text-body mb-1.5">
                    GST number{' '}
                    <span className="font-body text-xs text-muted font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Building2 size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      disabled={saving}
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>
              </div>

              {saveError && <Alert variant="error" className="mb-4">{saveError}</Alert>}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card>
            <p className="font-heading text-base font-semibold text-heading mb-1">Shop Details</p>
            <InfoRow icon={<Store size={16} strokeWidth={2} />} label="Shop name" value={shop?.shopName} />
            <InfoRow icon={<User size={16} strokeWidth={2} />} label="Owner name" value={shop?.ownerName} />
            <InfoRow icon={<Tag size={16} strokeWidth={2} />} label="Store category" value={shop?.storeCategory} />
            <InfoRow icon={<CreditCard size={16} strokeWidth={2} />} label="UPI ID" value={shop?.upiId} />
            <InfoRow icon={<MapPin size={16} strokeWidth={2} />} label="Location" value={shop?.location} />
            <InfoRow icon={<Building2 size={16} strokeWidth={2} />} label="GST number" value={shop?.gstNumber} />
          </Card>
        )}

        {/* Account info — always read-only */}
        {!editing && (
          <Card>
            <p className="font-heading text-base font-semibold text-heading mb-1">Account Info</p>
            <InfoRow icon={<Hash size={16} strokeWidth={2} />} label="Account ID" value={shop?._id} />
            <InfoRow
              icon={<CheckCircle2 size={16} strokeWidth={2} />}
              label="Onboarded"
              value={shop?.isOnboarded ? 'Yes' : 'No'}
            />
            {memberSince && (
              <InfoRow icon={<Calendar size={16} strokeWidth={2} />} label="Member since" value={memberSince} />
            )}
            {shop?.updatedAt && (
              <InfoRow
                icon={<Calendar size={16} strokeWidth={2} />}
                label="Last updated"
                value={new Date(shop.updatedAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              />
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
