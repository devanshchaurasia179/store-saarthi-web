import { apiFetch } from './client'
import type { Customer } from '../types/bill'

// ── Types ──────────────────────────────────────────────────────────────────

export type LedgerEntry = {
  _id: string
  shopId: string
  customerId: string
  type: 'DEBIT' | 'CREDIT'
  amount: number
  billId: string | null
  note: string
  createdAt: string
  updatedAt: string
}

export type LedgerCustomer = {
  _id: string
  name: string
  mobileNumber: string
  totalPending: number
  isSupplier: boolean
  balanceType: 'DUE' | 'ADVANCE' | 'SETTLED'
  advanceAmount: number
}

export type CustomerLedgerResponse = {
  success: boolean
  customer: LedgerCustomer
  entries: LedgerEntry[]
}

export type AddDebitPayload = {
  customerId: string
  amount: number
  billId?: string
  note?: string
}

export type AddCreditPayload = {
  customerId: string
  amount: number
  note?: string
}

export type LedgerMutationResponse = {
  success: boolean
  ledgerEntry: LedgerEntry
  balance: { totalPending: number }
}

// ── API functions ──────────────────────────────────────────────────────────

export function fetchCustomers() {
  return apiFetch<{ success: boolean; customers: Customer[] }>('/api/customers')
}

export function fetchCustomerLedger(customerId: string) {
  return apiFetch<CustomerLedgerResponse>(`/api/ledger/customer/${customerId}`)
}

export function addDebit(payload: AddDebitPayload) {
  return apiFetch<LedgerMutationResponse>('/api/ledger/debit', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function addCredit(payload: AddCreditPayload) {
  return apiFetch<LedgerMutationResponse>('/api/ledger/credit', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createCustomer(payload: {
  name: string
  mobileNumber?: string
  isSupplier?: boolean
}) {
  return apiFetch<{ success: boolean; customer: Customer }>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
