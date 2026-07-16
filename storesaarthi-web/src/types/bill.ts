export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID'
export type PaymentMode = 'NONE' | 'CASH' | 'UPI' | 'OTHERS'

export type BillItem = {
  productId: string
  variantId?: string | null
  name: string
  quantity: number
  unit: string
  price: number
  total: number
}

export type BillCustomer = {
  _id: string
  name: string
  mobileNumber: string
} | null

export type Bill = {
  _id: string
  shopId: string
  dailyBillNumber: number
  customerId: BillCustomer | string | null
  items: BillItem[]
  subTotal: number
  discount: number
  taxPercentage: number
  totalAmount: number
  paidAmount: number
  paymentStatus: PaymentStatus
  paymentMode: PaymentMode
  createdAt: string
  updatedAt: string
}

export type CreateBillItem = {
  productId: string
  quantity: number
  variantId?: string
  unit?: string
}

export type CreateBillPayload = {
  items: CreateBillItem[]
  discount?: number
  taxPercentage?: number
  customerId?: string | null
  paidAmount?: number
  paymentMode?: PaymentMode
}

export type ProductVariant = {
  _id: string
  name: string
  price: { sellingPrice: number }
  quantity: number
  isActive?: boolean
}

export type Product = {
  _id: string
  name: string
  unit: string
  price: { sellingPrice: number }
  quantity: number
  isTrackable: boolean
  variants: ProductVariant[]
}

export type Customer = {
  _id: string
  name: string
  mobileNumber: string
  totalPending: number
  isSupplier?: boolean
}
