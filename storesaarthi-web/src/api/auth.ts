import { apiFetch } from './client'
import type { AuthResponse, MeResponse, OnboardingPayload, Shop } from '../types/auth'

export function sendOtp(mobileNumber: string) {
  return apiFetch<{ success: boolean; message: string }>('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber }),
  })
}

export function verifyOtp(mobileNumber: string, otp: string) {
  return apiFetch<AuthResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, otp }),
  })
}

export function loginWithSecret(mobileNumber: string, secretKey: string) {
  return apiFetch<AuthResponse>('/api/auth/login-with-secret', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, secretKey }),
  })
}

export function fetchMe() {
  return apiFetch<MeResponse>('/api/auth/me')
}

export function logoutRequest() {
  return apiFetch<{ success: boolean; message: string }>('/api/auth/logout', {
    method: 'POST',
  })
}

export function completeOnboarding(payload: OnboardingPayload) {
  return apiFetch<{ success: boolean; shop: Shop }>('/api/auth/onboarding', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
