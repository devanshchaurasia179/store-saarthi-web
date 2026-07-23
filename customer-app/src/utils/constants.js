export const APP_NAME = 'Store Saarthi'

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PACKING: 'packing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
}

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.ACCEPTED]: 'Accepted',
  [ORDER_STATUS.PACKING]: 'Packing',
  [ORDER_STATUS.READY]: 'Ready',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
}

export const DELIVERY_CHARGE = 30
export const FREE_DELIVERY_ABOVE = 499
