import { apiFetch } from './client'

export interface OnlineProfileAddress {
  street: string
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
}

export interface DeliverySlot {
  _id?: string
  label: string
  startTime: string
  endTime: string
  isActive: boolean
}

export interface BusinessHours {
  openTime: string
  closeTime: string
  offDays: string[]
}

export interface OnlineProfile {
  _id: string
  shop: string
  storeName: string
  ownerName: string
  storeDescription: string
  storeLogo: string
  storeBanner: string
  mobileNumber: string
  whatsappNumber: string
  email: string
  address: OnlineProfileAddress
  deliveryCharges: number
  freeDeliveryAbove: number
  minimumOrderAmount: number
  deliveryRadius: number
  estimatedDeliveryTime: string
  deliverySlots: DeliverySlot[]
  isOnlineOrderingEnabled: boolean
  isDeliveryAvailable: boolean
  isPickupAvailable: boolean
  acceptedPaymentMethods: string[]
  upiId: string
  businessHours: BusinessHours
  isProfileComplete: boolean
  isStoreOnline: boolean
  createdAt: string
  updatedAt: string
}

export type OnlineProfilePayload = Partial<
  Omit<OnlineProfile, '_id' | 'shop' | 'createdAt' | 'updatedAt' | 'isProfileComplete'>
>

export interface OnlineProfileDefaults {
  storeName: string
  ownerName: string
  mobileNumber: string
  upiId: string
  address: OnlineProfileAddress
}

export async function fetchOnlineProfile() {
  return apiFetch<{
    success: boolean
    profile: OnlineProfile | null
    defaults?: OnlineProfileDefaults
    message?: string
  }>('/api/online-profile')
}

export async function createOnlineProfile(data: OnlineProfilePayload) {
  return apiFetch<{ success: boolean; message: string; profile: OnlineProfile }>(
    '/api/online-profile',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export async function updateOnlineProfile(data: OnlineProfilePayload) {
  return apiFetch<{ success: boolean; message: string; profile: OnlineProfile }>(
    '/api/online-profile',
    { method: 'PUT', body: JSON.stringify(data) },
  )
}

export async function toggleStoreStatus() {
  return apiFetch<{ success: boolean; message: string; isStoreOnline: boolean }>(
    '/api/online-profile/toggle-status',
    { method: 'PATCH' },
  )
}
