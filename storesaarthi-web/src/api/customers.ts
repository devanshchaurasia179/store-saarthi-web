import { apiFetch } from './client'
import type { Customer } from '../types/bill'

export function fetchCustomers() {
  return apiFetch<{ success: boolean; customers: Customer[] }>('/api/customers')
}
