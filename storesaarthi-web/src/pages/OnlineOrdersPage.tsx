import { useMemo, useState } from 'react'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { useOnlineOrders } from '../hooks/useOnlineOrders'
import { createBillFromOrder, fetchOrderById } from '../api/orders'
import { printBill, printBillOnServer, printKOTOnAgent } from '../api/print'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import { OnlineProfileModal } from '../components/OnlineProfileModal'
import type { OnlineOrder, OrderStatus } from '../api/orders'
import type { PrintKOTPayload, PrintBillPayload } from '../api/print'
import '../styles/online-orders.css'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'packing', label: 'Packing' },
  { value: 'ready', label: 'Ready' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

const NEXT_STATUS_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  accepted: 'packing',
  packing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
}

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusColor(status: OrderStatus) {
  switch (status) {
    case 'pending': return 'amber'
    case 'accepted': return 'blue'
    case 'packing': return 'indigo'
    case 'ready': return 'teal'
    case 'out_for_delivery': return 'purple'
    case 'delivered': return 'green'
    case 'rejected': return 'red'
    case 'cancelled': return 'red'
    default: return 'gray'
  }
}

function statusLabel(status: OrderStatus) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function OnlineOrdersPage() {
  const { shop } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const { orders, loading, error, actionLoading, actionError, refresh, accept, reject, changeStatus } =
    useOnlineOrders(statusFilter || undefined)

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending').length
    const active = orders.filter((o) =>
      ['accepted', 'packing', 'ready', 'out_for_delivery'].includes(o.status),
    ).length
    const delivered = orders.filter((o) => o.status === 'delivered').length
    const totalRevenue = orders
      .filter((o) => o.status === 'delivered')
      .reduce((s, o) => s + o.totalAmount, 0)
    return { pending, active, delivered, totalRevenue, total: orders.length }
  }, [orders])

  // Split orders into "New" (pending + created within last 1 hour) and "Past"
  const { newOrders, pastOrders } = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const newOnes: OnlineOrder[] = []
    const pastOnes: OnlineOrder[] = []

    for (const order of orders) {
      const createdTime = new Date(order.createdAt).getTime()
      if (order.status === 'pending' && createdTime >= oneHourAgo) {
        newOnes.push(order)
      } else {
        pastOnes.push(order)
      }
    }

    return { newOrders: newOnes, pastOrders: pastOnes }
  }, [orders])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  function handleAccept(order: OnlineOrder) {
    accept(order._id).catch(() => {})
  }

  function handleReject(order: OnlineOrder) {
    reject(order._id).catch(() => {})
  }

  function handleNextStatus(order: OnlineOrder) {
    const next = NEXT_STATUS_MAP[order.status]
    if (next) changeStatus(order._id, next).catch(() => {})
  }

  async function handlePrintKOT(order: OnlineOrder) {
    setPrintingId(order._id)
    const kotPayload: PrintKOTPayload = {
      shopName: shop?.shopName || 'StoreSaarthi',
      billNumber: null,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        name: item.productName,
        qty: item.quantity,
      })),
      customerName: order.orderType === 'dineIn'
        ? `Table No. ${order.tableNumber || '—'}`
        : (order.customer?.name || null),
    }

    try {
      await printKOTOnAgent(kotPayload)
      showSuccess('✓ KOT Printed')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'KOT print failed')
      console.error('[OnlineOrders] KOT print error:', err)
      showSuccess(`✕ ${msg}`)
    } finally {
      setPrintingId(null)
    }
  }

  async function handleCreateBillAndPrint(order: OnlineOrder) {
    setPrintingId(order._id)

    try {
      const res = await createBillFromOrder(order._id, {
        paymentMode: order.paymentMethod === 'COD' ? 'CASH' : 'UPI',
        paidAmount: order.totalAmount,
      })

      const bill = res.bill
      const payload: PrintBillPayload = {
        shopName: shop?.shopName || 'StoreSaarthi',
        customerName: order.orderType === 'dineIn'
          ? `Table No. ${order.tableNumber || '—'}`
          : (order.customer?.name || null),
        billNumber: bill.dailyBillNumber,
        createdAt: bill.createdAt,
        items: (bill.items || []).map((item) => ({
          name: item.name,
          qty: item.quantity,
          price: item.price,
          total: item.total,
          unit: item.unit,
        })),
        subtotal: Number(bill.subTotal) || 0,
        discount: Number(bill.discount) || 0,
        tax: Number(bill.taxPercentage) || 0,
        total: Number(bill.totalAmount) || 0,
        paid: Number(bill.paidAmount) || 0,
        paymentMode: bill.paymentMode,
        paymentStatus: bill.paymentStatus,
        upiId: shop?.upiId || undefined,
      }

      try {
        await printBill(bill._id, payload)
        showSuccess('✓ Bill Created & Printed')
      } catch (printErr) {
        console.error('[OnlineOrders] Bill print error after create:', printErr)
        const msg = printErr instanceof ApiError ? printErr.message : (printErr instanceof Error ? printErr.message : 'print failed')
        showSuccess(`✓ Bill Created (print failed: ${msg})`)
      }

      refresh()
    } catch (err) {
      console.error('[OnlineOrders] createBillFromOrder error:', err)
      showSuccess(err instanceof ApiError ? `✕ ${err.message}` : '✕ Failed to create bill')
    } finally {
      setPrintingId(null)
    }
  }

  async function handlePrintKOTAndBill(order: OnlineOrder) {
    setPrintingId(order._id)

    const kotPayload: PrintKOTPayload = {
      shopName: shop?.shopName || 'StoreSaarthi',
      billNumber: null,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        name: item.productName,
        qty: item.quantity,
      })),
      customerName: order.orderType === 'dineIn'
        ? `Table No. ${order.tableNumber || '—'}`
        : (order.customer?.name || null),
    }

    try {
      await printKOTOnAgent(kotPayload)
    } catch {
      // KOT failed silently, still proceed with bill
    }

    try {
      const res = await createBillFromOrder(order._id, {
        paymentMode: order.paymentMethod === 'COD' ? 'CASH' : 'UPI',
        paidAmount: order.totalAmount,
      })

      const bill = res.bill
      const payload: PrintBillPayload = {
        shopName: shop?.shopName || 'StoreSaarthi',
        customerName: order.orderType === 'dineIn'
          ? `Table No. ${order.tableNumber || '—'}`
          : (order.customer?.name || null),
        billNumber: bill.dailyBillNumber,
        createdAt: bill.createdAt,
        items: (bill.items || []).map((item) => ({
          name: item.name,
          qty: item.quantity,
          price: item.price,
          total: item.total,
          unit: item.unit,
        })),
        subtotal: Number(bill.subTotal) || 0,
        discount: Number(bill.discount) || 0,
        tax: Number(bill.taxPercentage) || 0,
        total: Number(bill.totalAmount) || 0,
        paid: Number(bill.paidAmount) || 0,
        paymentMode: bill.paymentMode,
        paymentStatus: bill.paymentStatus,
        upiId: shop?.upiId || undefined,
      }

      try {
        await printBill(bill._id, payload)
        showSuccess('✓ KOT + Bill Printed')
      } catch (printErr) {
        console.error('[OnlineOrders] KOT+Bill print error:', printErr)
        showSuccess('✓ Bill Created, KOT sent (bill print failed)')
      }

      refresh()
    } catch (err) {
      console.error('[OnlineOrders] KOT+Bill createBillFromOrder error:', err)
      showSuccess(err instanceof ApiError ? `✕ ${err.message}` : '✕ Failed to create bill')
    } finally {
      setPrintingId(null)
    }
  }

  async function handleReprintBill(order: OnlineOrder) {
    if (!order.bill) return
    setPrintingId(order._id)

    try {
      const res = await fetchOrderById(order._id)
      const fullOrder = res.order

      const bill = fullOrder.bill as unknown as {
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

      if (!bill || typeof bill === 'string') {
        await printBillOnServer(order.bill as string)
        showSuccess('✓ Bill Printed')
        return
      }

      const payload: PrintBillPayload = {
        shopName: shop?.shopName || 'StoreSaarthi',
        customerName: order.orderType === 'dineIn'
          ? `Table No. ${order.tableNumber || '—'}`
          : (order.customer?.name || null),
        billNumber: bill.dailyBillNumber,
        createdAt: bill.createdAt,
        items: (bill.items || []).map((item) => ({
          name: item.name,
          qty: item.quantity,
          price: item.price,
          total: item.total,
          unit: item.unit,
        })),
        subtotal: Number(bill.subTotal) || 0,
        discount: Number(bill.discount) || 0,
        tax: Number(bill.taxPercentage) || 0,
        total: Number(bill.totalAmount) || 0,
        paid: Number(bill.paidAmount) || 0,
        paymentMode: bill.paymentMode,
        paymentStatus: bill.paymentStatus,
        upiId: shop?.upiId || undefined,
      }

      await printBill(typeof bill._id === 'string' ? bill._id : order.bill as string, payload)
      showSuccess('✓ Bill Printed')
    } catch (err) {
      console.error('[OnlineOrders] Reprint error:', err)
      showSuccess(err instanceof ApiError ? `✕ ${err.message}` : '✕ Failed to print bill')
    } finally {
      setPrintingId(null)
    }
  }

  function renderOrderCard(order: OnlineOrder) {
    return (
      <div
        className={`orders-page__card${expandedId === order._id ? ' orders-page__card--expanded' : ''}`}
        onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
        role="button"
        tabIndex={0}
        aria-expanded={expandedId === order._id}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpandedId(expandedId === order._id ? null : order._id)
          }
        }}
      >
        <div className="orders-page__card-top">
          <div className="orders-page__card-left">
            <div className="orders-page__card-icon">
              {order.orderType === 'dineIn' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                  <path d="M7 2v20" />
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              )}
            </div>
            <div className="orders-page__card-info">
              <p className="orders-page__card-customer">
                {order.orderType === 'dineIn'
                  ? `Table No. ${order.tableNumber || '—'}`
                  : (order.customer?.name || 'Customer')}
              </p>
              <p className="orders-page__card-phone">
                {order.orderType === 'dineIn' ? '' : (order.customer?.phone || '')}
              </p>
              <p className="orders-page__card-time">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          <div className="orders-page__card-right">
            <span className={`orders-page__order-type-tag orders-page__order-type-tag--${order.orderType === 'dineIn' ? 'dinein' : 'delivery'}`}>
              {order.orderType === 'dineIn' ? 'Dine In' : 'Delivery'}
            </span>
            <span className={`orders-page__badge orders-page__badge--${statusColor(order.status)}`}>
              {statusLabel(order.status)}
            </span>
            <p className="orders-page__card-amount">{formatMoney(order.totalAmount)}</p>
            <p className="orders-page__card-items-count">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Expanded details */}
        {expandedId === order._id && (
          <div className="orders-page__card-detail" onClick={(e) => e.stopPropagation()}>
            {/* Items */}
            <div className="orders-page__detail-section">
              <h4>Items</h4>
              <table className="orders-page__items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.price)}</td>
                      <td>{formatMoney(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Address or Table Number */}
            {order.orderType === 'dineIn' ? (
              <div className="orders-page__detail-section">
                <h4>Table Number</h4>
                <p className="orders-page__address">{order.tableNumber || '—'}</p>
              </div>
            ) : order.address && (
              <div className="orders-page__detail-section">
                <h4>Delivery Address</h4>
                <p className="orders-page__address">
                  {[
                    order.address.houseNumber,
                    order.address.fullAddress,
                    order.address.landmark,
                    order.address.city,
                    order.address.state,
                    order.address.pincode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="orders-page__detail-section">
                <h4>Notes</h4>
                <p className="orders-page__notes">{order.notes}</p>
              </div>
            )}

            {/* Payment */}
            <div className="orders-page__detail-section">
              <h4>Payment</h4>
              <p>{order.paymentMethod}</p>
            </div>

            {/* Actions */}
            <div className="orders-page__actions">
              {order.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="orders-page__action-btn orders-page__action-btn--accept"
                    onClick={() => handleAccept(order)}
                    disabled={actionLoading}
                  >
                    ✓ Accept
                  </button>
                  <button
                    type="button"
                    className="orders-page__action-btn orders-page__action-btn--reject"
                    onClick={() => handleReject(order)}
                    disabled={actionLoading}
                  >
                    ✕ Reject
                  </button>
                </>
              )}

              {NEXT_STATUS_MAP[order.status] && (
                <button
                  type="button"
                  className="orders-page__action-btn orders-page__action-btn--next"
                  onClick={() => handleNextStatus(order)}
                  disabled={actionLoading}
                >
                  Mark as {statusLabel(NEXT_STATUS_MAP[order.status]!)}
                </button>
              )}

              {!['rejected', 'cancelled', 'delivered'].includes(order.status) && (
                <button
                  type="button"
                  className="orders-page__action-btn orders-page__action-btn--kot"
                  onClick={() => handlePrintKOT(order)}
                  disabled={printingId === order._id}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print KOT
                </button>
              )}

              {!order.bill && !['rejected', 'cancelled'].includes(order.status) && (
                <button
                  type="button"
                  className="orders-page__action-btn orders-page__action-btn--bill"
                  onClick={() => handleCreateBillAndPrint(order)}
                  disabled={printingId === order._id}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
                    <line x1="8" y1="8" x2="16" y2="8" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Create Bill & Print
                </button>
              )}

              {!order.bill && !['rejected', 'cancelled'].includes(order.status) && (
                <button
                  type="button"
                  className="orders-page__action-btn orders-page__action-btn--combo"
                  onClick={() => handlePrintKOTAndBill(order)}
                  disabled={printingId === order._id}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  KOT + Bill
                </button>
              )}

              {order.bill && (
                <button
                  type="button"
                  className="orders-page__action-btn orders-page__action-btn--reprint"
                  onClick={() => handleReprintBill(order)}
                  disabled={printingId === order._id}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Reprint Bill
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout>
      <main className="orders-page">
        {/* Success Toast */}
        {successMsg && <div className="orders-page__toast">{successMsg}</div>}

        {/* Header */}
        <div className="orders-page__header">
          <div className="orders-page__header-left">
            <h1 className="orders-page__title">Online Orders</h1>
            <p className="orders-page__subtitle">Manage orders from your online customers</p>
          </div>
          <div className="orders-page__header-right">
            <button
              type="button"
              className="orders-page__profile-btn"
              onClick={() => setProfileModalOpen(true)}
              aria-label="Store Profile"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Store Profile
            </button>
            <button
              type="button"
              className="orders-page__refresh-btn"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh orders"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && !error && orders.length > 0 && (
          <div className="orders-page__stats">
            <div className="orders-page__stat">
              <div className="orders-page__stat-icon orders-page__stat-icon--amber">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="orders-page__stat-content">
                <span className="orders-page__stat-label">Pending</span>
                <span className="orders-page__stat-value">{stats.pending}</span>
              </div>
            </div>
            <div className="orders-page__stat">
              <div className="orders-page__stat-icon orders-page__stat-icon--blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="orders-page__stat-content">
                <span className="orders-page__stat-label">Active</span>
                <span className="orders-page__stat-value">{stats.active}</span>
              </div>
            </div>
            <div className="orders-page__stat">
              <div className="orders-page__stat-icon orders-page__stat-icon--green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="orders-page__stat-content">
                <span className="orders-page__stat-label">Delivered</span>
                <span className="orders-page__stat-value">{stats.delivered}</span>
              </div>
            </div>
            <div className="orders-page__stat">
              <div className="orders-page__stat-icon orders-page__stat-icon--indigo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="orders-page__stat-content">
                <span className="orders-page__stat-label">Revenue (Delivered)</span>
                <span className="orders-page__stat-value">{formatMoney(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Tabs */}
        {!loading && !error && (
          <div className="orders-page__tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`orders-page__tab${statusFilter === tab.value ? ' orders-page__tab--active' : ''}`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Action Error */}
        {actionError && (
          <div className="orders-page__error orders-page__error--action">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p>{actionError}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="orders-page__loading">
            <div className="orders-page__loading-spinner" />
            <p>Loading orders…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="orders-page__error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && orders.length === 0 && (
          <div className="orders-page__empty">
            <div className="orders-page__empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <h3>No orders yet</h3>
            <p>Online orders from your customers will appear here</p>
          </div>
        )}

        {/* New Orders Section */}
        {!loading && newOrders.length > 0 && (
          <div className="orders-page__section">
            <div className="orders-page__section-header orders-page__section-header--new">
              <div className="orders-page__section-badge orders-page__section-badge--new">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                New Orders
                <span className="orders-page__section-count">{newOrders.length}</span>
              </div>
              <p className="orders-page__section-desc">Pending orders from the last hour</p>
            </div>
            <ul className="orders-page__list">
              {newOrders.map((order) => (
                <li key={order._id} className="orders-page__card-wrapper">
                  {renderOrderCard(order)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Past Orders Section */}
        {!loading && pastOrders.length > 0 && (
          <div className="orders-page__section">
            <div className="orders-page__section-header orders-page__section-header--past">
              <div className="orders-page__section-badge orders-page__section-badge--past">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Previous Orders
                <span className="orders-page__section-count">{pastOrders.length}</span>
              </div>
              <p className="orders-page__section-desc">All other orders</p>
            </div>
            <ul className="orders-page__list">
              {pastOrders.map((order) => (
                <li key={order._id} className="orders-page__card-wrapper">
                  {renderOrderCard(order)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Online Profile Modal */}
      <OnlineProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </DashboardLayout>
  )
}
