import api from './api'

export const addressService = {
  getAddresses: () => api.get('/customer-auth/me').then((res) => res.data.customer.addresses),
  addAddress: (data) => api.post('/customer-auth/addresses', data),
  updateAddress: (id, data) => api.patch(`/customer-auth/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/customer-auth/addresses/${id}`),
  setDefault: (id) => api.patch(`/customer-auth/addresses/${id}`, { isDefault: true }),
}
