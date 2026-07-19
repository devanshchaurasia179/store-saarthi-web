import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { fetchBillById } from '../api/bills'
import { billToPrintPayload, printBill } from '../api/print'
import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import type { Bill, BillCustomer } from '../types/bill'

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

function customerLabel(customerId: Bill['customerId']) {
  if (!customerId) return 'Walk-in'
  if (typeof customerId === 'string') return 'Customer'
  return `${customerId.name} · ${customerId.mobileNumber}`
}

function customerNameOnly(customerId: Bill['customerId']) {
  if (!customerId) return null
  if (typeof customerId === 'string') return null
  return customerId.name
}

export function BillDetailPage() {
  const { billId } = useParams<{ billId: string }>()
  const { shop } = useAuth()
  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [printBusy, setPrintBusy] = useState(false)
  const [printMsg, setPrintMsg] = useState('')
  const [printErr, setPrintErr] = useState('')

  useEffect(() => {
    if (!billId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetchBillById(billId!)
        if (!cancelled) setBill(res.bill)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Failed to load bill',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [billId])

  const customer = bill?.customerId as BillCustomer | string | null | undefined
  const taxAmount = bill
    ? (Number(bill.subTotal) * Number(bill.taxPercentage)) / 100
    : 0

  async function handleThermalPrint() {
    if (!bill || !billId) return
    setPrintBusy(true)
    setPrintMsg('')
    setPrintErr('')
    try {
      const payload = billToPrintPayload(
        bill,
        shop?.shopName || 'StoreSaarthi',
        customerNameOnly(customer ?? null),
        shop?.upiId || undefined,
      )
      const res = await printBill(billId, payload)
      setPrintMsg(res.message)
    } catch (err) {
      setPrintErr(
        err instanceof ApiError
          ? err.message
          : 'Print failed. Start the print-agent or use browser print.',
      )
    } finally {
      setPrintBusy(false)
    }
  }

  function handleBrowserPrint() {
    setPrintMsg('')
    setPrintErr('')
    window.print()
  }

  return (
    <DashboardLayout>
      <main className="bill-detail-page">
        {/* Loading */}
        {loading && (
          <div className="bill-detail-page__loading no-print">
            <div className="bill-detail-page__spinner" />
            <p>Loading bill…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bill-detail-page__error no-print">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {bill && (
          <>
            {/* Header */}
            <div className="bill-detail-page__header no-print">
              <div className="bill-detail-page__header-left">
                <Link to="/bills" className="bill-detail-page__back">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back to Bills
                </Link>
                <h1 className="bill-detail-page__title">Bill #{bill.dailyBillNumber}</h1>
                <p className="bill-detail-page__date">{formatDate(bill.createdAt)}</p>
              </div>
              <div className="bill-detail-page__header-right">
                <span className={`bill-detail-page__status bill-detail-page__status--${bill.paymentStatus.toLowerCase()}`}>
                  {bill.paymentStatus}
                </span>
              </div>
            </div>

            {/* Print actions */}
            <div className="bill-detail-page__actions no-print">
              <button
                type="button"
                className="bill-detail-page__print-btn"
                disabled={printBusy}
                onClick={() => void handleThermalPrint()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                {printBusy ? 'Printing…' : 'Print Receipt'}
              </button>
              <button
                type="button"
                className="bill-detail-page__browser-btn"
                onClick={handleBrowserPrint}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                Browser Print
              </button>
            </div>

            {/* Messages */}
            {printMsg && (
              <div className="bill-detail-page__msg bill-detail-page__msg--success no-print">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {printMsg}
              </div>
            )}
            {printErr && (
              <div className="bill-detail-page__msg bill-detail-page__msg--error no-print">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {printErr}
              </div>
            )}

            {/* Bill content */}
            <div className="bill-detail-page__content no-print">
              {/* Meta cards */}
              <div className="bill-detail-page__meta">
                <div className="bill-detail-page__meta-card">
                  <div className="bill-detail-page__meta-icon bill-detail-page__meta-icon--blue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="bill-detail-page__meta-info">
                    <span className="bill-detail-page__meta-label">Customer</span>
                    <strong className="bill-detail-page__meta-value">{customerLabel(customer ?? null)}</strong>
                  </div>
                </div>
                <div className="bill-detail-page__meta-card">
                  <div className="bill-detail-page__meta-icon bill-detail-page__meta-icon--green">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  </div>
                  <div className="bill-detail-page__meta-info">
                    <span className="bill-detail-page__meta-label">Payment Mode</span>
                    <strong className="bill-detail-page__meta-value">{bill.paymentMode}</strong>
                  </div>
                </div>
                <div className="bill-detail-page__meta-card">
                  <div className="bill-detail-page__meta-icon bill-detail-page__meta-icon--indigo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div className="bill-detail-page__meta-info">
                    <span className="bill-detail-page__meta-label">Amount Paid</span>
                    <strong className="bill-detail-page__meta-value">{formatMoney(bill.paidAmount)}</strong>
                  </div>
                </div>
              </div>

              {/* Items section */}
              <section className="bill-detail-page__items-section">
                <div className="bill-detail-page__items-header">
                  <h2>Items</h2>
                  <span className="bill-detail-page__items-count">
                    {(bill.items || []).length} item{(bill.items || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="bill-detail-page__items-table">
                  <div className="bill-detail-page__items-thead">
                    <span>Product</span>
                    <span>Qty</span>
                    <span>Rate</span>
                    <span>Amount</span>
                  </div>
                  <ul className="bill-detail-page__items-list">
                    {(bill.items || []).map((item, index) => (
                      <li key={`${item.productId}-${index}`} className="bill-detail-page__item-row">
                        <span className="bill-detail-page__item-name">{item.name}</span>
                        <span className="bill-detail-page__item-qty">
                          {item.quantity} {item.unit !== 'unit' ? item.unit : ''}
                        </span>
                        <span className="bill-detail-page__item-rate">{formatMoney(item.price)}</span>
                        <span className="bill-detail-page__item-total">{formatMoney(item.total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Totals */}
              <section className="bill-detail-page__totals">
                <div className="bill-detail-page__totals-row">
                  <span>Subtotal</span>
                  <strong>{formatMoney(bill.subTotal)}</strong>
                </div>
                {Number(bill.discount) > 0 && (
                  <div className="bill-detail-page__totals-row">
                    <span>Discount</span>
                    <strong className="bill-detail-page__totals-discount">−{formatMoney(bill.discount)}</strong>
                  </div>
                )}
                {Number(bill.taxPercentage) > 0 && (
                  <div className="bill-detail-page__totals-row">
                    <span>Tax ({bill.taxPercentage}%)</span>
                    <strong>{formatMoney(taxAmount)}</strong>
                  </div>
                )}
                <div className="bill-detail-page__totals-row bill-detail-page__totals-grand">
                  <span>Total</span>
                  <strong>{formatMoney(bill.totalAmount)}</strong>
                </div>
              </section>
            </div>

            {/* Printable receipt — shown only when printing via browser */}
            <article className="receipt-print" aria-hidden="true">
              <header className="receipt-print__header">
                <h1>{shop?.shopName || 'StoreSaarthi'}</h1>
                <p>Bill #{bill.dailyBillNumber}</p>
                <p>{formatDate(bill.createdAt)}</p>
                {customerNameOnly(customer ?? null) && (
                  <p>Customer: {customerNameOnly(customer ?? null)}</p>
                )}
              </header>

              <table className="receipt-print__table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {(bill.items || []).map((item, index) => (
                    <tr key={`${item.productId}-print-${index}`}>
                      <td>{item.name}</td>
                      <td>
                        {item.quantity}
                        {item.unit && item.unit !== 'unit'
                          ? ` ${item.unit}`
                          : ''}
                      </td>
                      <td>{formatMoney(item.price)}</td>
                      <td>{formatMoney(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <dl className="receipt-print__totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(bill.subTotal)}</dd>
                </div>
                {Number(bill.discount) > 0 && (
                  <div>
                    <dt>Discount</dt>
                    <dd>−{formatMoney(bill.discount)}</dd>
                  </div>
                )}
                {Number(bill.taxPercentage) > 0 && (
                  <div>
                    <dt>Tax ({bill.taxPercentage}%)</dt>
                    <dd>{formatMoney(taxAmount)}</dd>
                  </div>
                )}
                <div className="receipt-print__grand">
                  <dt>TOTAL</dt>
                  <dd>{formatMoney(bill.totalAmount)}</dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd>{formatMoney(bill.paidAmount)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{bill.paymentStatus}</dd>
                </div>
                {bill.paymentMode !== 'NONE' && (
                  <div>
                    <dt>Mode</dt>
                    <dd>{bill.paymentMode}</dd>
                  </div>
                )}
              </dl>

              <p className="receipt-print__thanks">Thank you! Visit again.</p>
            </article>
          </>
        )}
      </main>
    </DashboardLayout>
  )
}
