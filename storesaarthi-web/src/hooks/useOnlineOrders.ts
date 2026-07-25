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

const POLL_INTERVAL = 3000 // 3 seconds

// Play beep sound from public folder — loops for 3 seconds
const beepAudio = new Audio('/beep.mp3')
beepAudio.preload = 'auto'
beepAudio.loop = true

let beepTimeout: ReturnType<typeof setTimeout> | null = null

function playNewOrderBeep() {
  try {
    // Stop any ongoing beep first
    if (beepTimeout) {
      clearTimeout(beepTimeout)
      beepTimeout = null
    }

    beepAudio.currentTime = 0
    beepAudio.loop = true
    beepAudio.play().catch(() => {
      // Browser may block autoplay until user interaction
    })

    // Stop after 3 seconds
    beepTimeout = setTimeout(() => {
      beepAudio.pause()
      beepAudio.currentTime = 0
      beepAudio.loop = false
      beepTimeout = null
    }, 3000)
  } catch {
    // Silently ignore if audio fails
  }
}

export function useOnlineOrders(statusFilter?: string): UseOnlineOrdersReturn {
  const [orders, setOrders] = useState<OnlineOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const refreshRef = useRef(0)
  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  const load = useCallback(() => {
    refreshRef.current += 1
    const tick = refreshRef.current

    setLoading(true)
    setError('')

    fetchOrders({ status: statusFilter, limit: 50 })
      .then((res) => {
        if (tick !== refreshRef.current) return
        setOrders(res.orders)

        // On first load, just record known IDs without beeping
        if (isFirstLoadRef.current) {
          isFirstLoadRef.current = false
          knownOrderIdsRef.current = new Set(res.orders.map((o) => o._id))
        }
      })
      .catch((err) => {
        if (tick !== refreshRef.current) return
        setError(err instanceof ApiError ? err.message : 'Failed to load orders')
      })
      .finally(() => {
        if (tick === refreshRef.current) setLoading(false)
      })
  }, [statusFilter])

  // Silent poll — fetches orders without showing loading state
  const poll = useCallback(() => {
    fetchOrders({ status: statusFilter, limit: 50 })
      .then((res) => {
        setOrders(res.orders)

        // Check for new pending orders that we haven't seen before
        const currentIds = new Set(res.orders.map((o) => o._id))
        const newPendingOrders = res.orders.filter(
          (o) => o.status === 'pending' && !knownOrderIdsRef.current.has(o._id),
        )

        if (newPendingOrders.length > 0) {
          playNewOrderBeep()
        }

        // Update known IDs
        knownOrderIdsRef.current = currentIds
      })
      .catch(() => {
        // Silent fail on poll — don't show error for background fetches
      })
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  // Polling every 3 seconds
  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [poll])

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
