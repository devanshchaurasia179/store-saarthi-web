export type Shop = {
  _id: string
  shopName: string
  ownerName: string
  mobileNumber: string
  gstNumber?: string
  storeCategory?: string
  upiId?: string
  location?: string
  isOnboarded?: boolean
  hasAnalyticsPin?: boolean
  createdAt?: string
  updatedAt?: string
}

export type AuthResponse = {
  success: boolean
  token: string
  shop: Shop
  secretKey?: string | null
  message?: string
}

export type MeResponse = {
  success: boolean
  shop: Shop
}

export type OnboardingPayload = {
  shopName: string
  ownerName: string
  gstNumber?: string
  storeCategory?: string
  upiId?: string
  location?: string
}
