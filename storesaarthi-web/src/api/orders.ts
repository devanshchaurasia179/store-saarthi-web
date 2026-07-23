import { apiFetch } from './client'

/* =========================================================
   ONLINE ORDERS API
   - Talks to /api/shop/orders endpoints
========================================================= */

export type OrderItem = {
  product: string
  productName: string
  price: number
  quantity: number
  subtotal: number
}

export type OrderAddress = {
  label: string
  fullAddress: string
  houseNumber: string
  landmark: string
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
}

export type OrderCustomer = {
  _id: string
  name: string
  phone: string
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'packing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type OnlineOrder = {
  _id: string
  shop: string
  customer: OrderCustomer
  items: OrderItem[]
  address: OrderAddress
  paymentMethod: 'COD' | 'UPI' | 'ONLINE'
  notes: string
  status: OrderStatus
  totalAmount: number
  bill: string | null
  acceptedBy: string
  createdAt: string
  updatedAt: string
}

type OrdersResponse = {
  success: boolean
  orders: OnlineOrder[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type SingleOrderResponse = {
  success: boolean
  order: OnlineOrder
}

type ActionResponse = {
  success: boolean
  message: string
  order: OnlineOrder
}

/* ---------- FETCH ALL ORDERS ---------- */
export function fetchOrders(params?: { status?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const qs = searchParams.toString()
  return apiFetch<OrdersResponse>(`/api/shop/orders${qs ? `?${qs}` : ''}`)
}

/* ---------- FETCH SINGLE ORDER ---------- */
export function fetchOrderById(id: string) {
  return apiFetch<SingleOrderResponse>(`/api/shop/orders/${id}`)
}

/* ---------- ACCEPT ORDER ---------- */
export function acceptOrder(id: string) {
  return apiFetch<ActionResponse>(`/api/shop/orders/${id}/accept`, {
    method: 'PATCH',
  })
}

/* ---------- REJECT ORDER ---------- */
export function rejectOrder(id: string) {
  return apiFetch<ActionResponse>(`/api/shop/orders/${id}/reject`, {
    method: 'PATCH',
  })
}

/* ---------- UPDATE ORDER STATUS ---------- */
export function updateOrderStatus(id: string, status: OrderStatus) {
  return apiFetch<ActionResponse>(`/api/shop/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/* ---------- CREATE BILL FROM ORDER ---------- */
type CreateBillFromOrderPayload = {
  paymentMode?: string
  paidAmount?: number
  discount?: number
  taxPercentage?: number
}

type CreateBillResponse = {
  success: boolean
  message: string
  order: { _id: string; status: string; bill: string }
  bill: {
    _id: string
    dailyBillNumber: number
    createdAt: string
    items: Array<{ name: string; quantity: number; price: number; total: number; unit?: string }>
    subTotal: number
    discount: number
    taxPercentage: number
    totalAmount: number
    paidAmount: number
    paymentMode: string
    paymentStatus: string
  }
}

export function createBillFromOrder(id: string, payload?: CreateBillFromOrderPayload) {
  return apiFetch<CreateBillResponse>(`/api/shop/orders/${id}/create-bill`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}
