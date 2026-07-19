import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
import {
  addCredit,
  addDebit,
  createCustomer,
  fetchCustomerLedger,
  fetchCustomers,
} from '../api/ledger'
import type {
  AddCreditPayload,
  AddDebitPayload,
  LedgerCustomer,
  LedgerEntry,
} from '../api/ledger'
import type { Customer } from '../types/bill'

// ── Customer list hook ──────────────────────────────────────────────────────

type UseCustomersReturn = {
  customers: Customer[]
  loading: boolean
  error: string
  saving: boolean
  saveError: string
  refresh: () => void
  addCustomer: (payload: {
    name: string
    mobileNumber?: string
    isSupplier?: boolean
  }) => Promise<Customer>
}

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const refreshRef = useRef(0)

  const load = useCallback(() => {
    refreshRef.current += 1
    const tick = refreshRef.current

    setLoading(true)
    setError('')

    fetchCustomers()
      .then((res) => {
        if (tick !== refreshRef.current) return
        setCustomers(res.customers)
      })
      .catch((err) => {
        if (tick !== refreshRef.current) return
        setError(
          err instanceof ApiError ? err.message : 'Failed to load customers',
        )
      })
      .finally(() => {
        if (tick === refreshRef.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addCustomer = useCallback(
    async (payload: {
      name: string
      mobileNumber?: string
      isSupplier?: boolean
    }): Promise<Customer> => {
      setSaving(true)
      setSaveError('')
      try {
        const res = await createCustomer(payload)
        setCustomers((prev) => [res.customer, ...prev])
        return res.customer
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Failed to add customer'
        setSaveError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  return {
    customers,
    loading,
    error,
    saving,
    saveError,
    refresh: load,
    addCustomer,
  }
}

// ── Individual customer ledger hook ────────────────────────────────────────

type UseCustomerLedgerReturn = {
  customer: LedgerCustomer | null
  entries: LedgerEntry[]
  loading: boolean
  error: string
  saving: boolean
  saveError: string
  refresh: () => void
  recordDebit: (payload: Omit<AddDebitPayload, 'customerId'>) => Promise<void>
  recordCredit: (payload: Omit<AddCreditPayload, 'customerId'>) => Promise<void>
}

export function useCustomerLedger(customerId: string): UseCustomerLedgerReturn {
  const [customer, setCustomer] = useState<LedgerCustomer | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const refreshRef = useRef(0)

  const load = useCallback(() => {
    if (!customerId) return

    refreshRef.current += 1
    const tick = refreshRef.current

    setLoading(true)
    setError('')

    fetchCustomerLedger(customerId)
      .then((res) => {
        if (tick !== refreshRef.current) return
        setCustomer(res.customer)
        setEntries(res.entries)
      })
      .catch((err) => {
        if (tick !== refreshRef.current) return
        setError(
          err instanceof ApiError ? err.message : 'Failed to load ledger',
        )
      })
      .finally(() => {
        if (tick === refreshRef.current) setLoading(false)
      })
  }, [customerId])

  useEffect(() => {
    load()
  }, [load])

  const recordDebit = useCallback(
    async (payload: Omit<AddDebitPayload, 'customerId'>) => {
      setSaving(true)
      setSaveError('')
      try {
        const res = await addDebit({ ...payload, customerId })
        // Prepend new entry and update customer balance
        setEntries((prev) => [res.ledgerEntry, ...prev])
        setCustomer((prev) =>
          prev
            ? {
                ...prev,
                totalPending: res.balance.totalPending,
                balanceType:
                  res.balance.totalPending > 0
                    ? 'DUE'
                    : res.balance.totalPending < 0
                      ? 'ADVANCE'
                      : 'SETTLED',
                advanceAmount:
                  res.balance.totalPending < 0
                    ? Math.abs(res.balance.totalPending)
                    : 0,
              }
            : prev,
        )
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Failed to record debit'
        setSaveError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [customerId],
  )

  const recordCredit = useCallback(
    async (payload: Omit<AddCreditPayload, 'customerId'>) => {
      setSaving(true)
      setSaveError('')
      try {
        const res = await addCredit({ ...payload, customerId })
        setEntries((prev) => [res.ledgerEntry, ...prev])
        setCustomer((prev) =>
          prev
            ? {
                ...prev,
                totalPending: res.balance.totalPending,
                balanceType:
                  res.balance.totalPending > 0
                    ? 'DUE'
                    : res.balance.totalPending < 0
                      ? 'ADVANCE'
                      : 'SETTLED',
                advanceAmount:
                  res.balance.totalPending < 0
                    ? Math.abs(res.balance.totalPending)
                    : 0,
              }
            : prev,
        )
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Failed to record credit'
        setSaveError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [customerId],
  )

  return {
    customer,
    entries,
    loading,
    error,
    saving,
    saveError,
    refresh: load,
    recordDebit,
    recordCredit,
  }
}
