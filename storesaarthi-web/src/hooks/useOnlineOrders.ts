import { useCallback, useEffect, useRef, useState } from 'react'
import {
  acceptOrder,
  fetchOrders,
  rejectOrder,
  updateOrderStatus,
} from '../api/orders'
import { ApiError } from '../api/client'
import type { OnlineOrder, OrderStatus } from '../api/orders'

type UseOnlineOrdersReturn = {
  orders: OnlineOrder[]
  loading: boolean
  error: string
  actionLoading: boolean
  actionError: string
  refresh: () => void
  accept: (id: string) => Promise<void>
  reject: (id: string) => Promise<void>
  changeStatus: (id: string, status: OrderStatus) => Promise<void>
}

export function useOnlineOrders(statusFilter?: string): UseOnlineOrdersReturn {
  const [orders, setOrders] = useState<OnlineOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const refreshRef = useRef(0)

  const load = useCallback(() => {
    refreshRef.current += 1
    const tick = refreshRef.current

    setLoading(true)
    setError('')

    fetchOrders({ status: statusFilter, limit: 50 })
      .then((res) => {
        if (tick !== refreshRef.current) return
        setOrders(res.orders)
      })
      .catch((err) => {
        if (tick !== refreshRef.current) return
        setError(err instanceof ApiError ? err.message : 'Failed to load orders')
      })
      .finally(() => {
        if (tick === refreshRef.current) setLoading(false)
      })
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const accept = useCallback(async (id: string) => {
    setActionLoading(true)
    setActionError('')
    try {
      const res = await acceptOrder(id)
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, ...res.order } : o)),
      )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to accept order'
      setActionError(msg)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  const reject = useCallback(async (id: string) => {
    setActionLoading(true)
    setActionError('')
    try {
      const res = await rejectOrder(id)
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, ...res.order } : o)),
      )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to reject order'
      setActionError(msg)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  const changeStatus = useCallback(async (id: string, status: OrderStatus) => {
    setActionLoading(true)
    setActionError('')
    try {
      const res = await updateOrderStatus(id, status)
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, ...res.order } : o)),
      )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update order status'
      setActionError(msg)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  return {
    orders,
    loading,
    error,
    actionLoading,
    actionError,
    refresh: load,
    accept,
    reject,
    changeStatus,
  }
}
