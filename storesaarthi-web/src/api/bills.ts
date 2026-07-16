import { apiFetch } from './client'
import type { Bill, CreateBillPayload } from '../types/bill'

export function fetchBills() {
  return apiFetch<{ success: boolean; bills: Bill[] }>('/api/bills')
}

export function fetchBillById(billId: string) {
  return apiFetch<{ success: boolean; bill: Bill }>(`/api/bills/${billId}`)
}

export function createBill(payload: CreateBillPayload) {
  return apiFetch<{ success: boolean; bill: Bill }>('/api/bills', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
