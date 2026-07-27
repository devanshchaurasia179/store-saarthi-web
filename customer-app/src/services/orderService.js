import api from './api'

export const orderService = {
  createOrder: (data) => api.post('/orders', data),
  createDineInOrder: (data) => api.post('/orders/dine-in', data),
  getOrders: (params) => api.get('/orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel`),

  // Razorpay payment
  createPaymentOrder: (orderId) => api.post(`/orders/${orderId}/pay`),
  verifyPayment: (orderId, paymentData) => api.post(`/orders/${orderId}/verify-payment`, paymentData),
}
