import api from './api'

export const authService = {
  sendOTP: (phone) => api.post('/customer-auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/customer-auth/verify-otp', { phone, otp }),
  getProfile: () => api.get('/customer-auth/me'),
  updateProfile: (data) => api.patch('/customer-auth/me', data),
  logout: () => api.post('/customer-auth/logout'),
}
