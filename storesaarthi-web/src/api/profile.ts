import { apiFetch } from './client'
import type { Shop } from '../types/auth'

export type UpdateProfilePayload = {
  shopName?: string
  ownerName?: string
  gstNumber?: string
  storeCategory?: string
  upiId?: string
  location?: string
}

export type UpdateProfileResponse = {
  success: boolean
  message: string
  shop: Shop
}

export type ChangePasswordPayload = {
  currentPassword?: string
  newPassword: string
}

export function updateProfile(payload: UpdateProfilePayload) {
  return apiFetch<UpdateProfileResponse>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
