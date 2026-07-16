import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { fetchBillById } from '../api/bills'
import { billToPrintPayload, printBill } from '../api/print'
import { useAuth } from '../context/AuthContext'
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
    <div className="dash">
      <header className="dash__bar no-print">
        <Link to="/bills" className="dash__brand">
          ← Bills
        </Link>
        <div className="dash__actions">
          <Link to="/bills/new" className="auth-link">
            New bill
          </Link>
        </div>
      </header>

      <main className="bills-main">
        {loading && <p className="dash__hint no-print">Loading bill…</p>}
        {error && (
          <p className="auth-msg auth-msg--error no-print">{error}</p>
        )}

        {bill && (
          <>
            <div className="bills-header no-print">
              <div>
                <h1>Bill #{bill.dailyBillNumber}</h1>
                <p className="dash__sub">{formatDate(bill.createdAt)}</p>
              </div>
              <span
                className={`bills-status bills-status--${bill.paymentStatus.toLowerCase()}`}
              >
                {bill.paymentStatus}
              </span>
            </div>

            <div className="bill-print-actions no-print">
              <button
                type="button"
                className="auth-btn"
                disabled={printBusy}
                onClick={() => void handleThermalPrint()}
              >
                {printBusy ? 'Printing…' : 'Print receipt'}
              </button>
              <button
                type="button"
                className="auth-btn auth-btn--ghost"
                onClick={handleBrowserPrint}
              >
                Browser print
              </button>
            </div>

            {printMsg && (
              <p className="auth-msg auth-msg--info no-print">{printMsg}</p>
            )}
            {printErr && (
              <p className="auth-msg auth-msg--error no-print">{printErr}</p>
            )}

            <div className="bill-detail no-print">
              <section className="bill-detail__meta">
                <div>
                  <span>Customer</span>
                  <strong>{customerLabel(customer ?? null)}</strong>
                </div>
                <div>
                  <span>Payment mode</span>
                  <strong>{bill.paymentMode}</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{formatMoney(bill.paidAmount)}</strong>
                </div>
              </section>

              <section>
                <h2>Items</h2>
                <ul className="bill-items">
                  {(bill.items || []).map((item, index) => (
                    <li key={`${item.productId}-${index}`} className="bill-item">
                      <div>
                        <p className="bill-item__name">{item.name}</p>
                        <p className="bill-item__meta">
                          {item.quantity} {item.unit} ×{' '}
                          {formatMoney(item.price)}
                        </p>
                      </div>
                      <p className="bill-item__total">
                        {formatMoney(item.total)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="create-bill__totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(bill.subTotal)}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>−{formatMoney(bill.discount)}</strong>
                </div>
                <div>
                  <span>Tax ({bill.taxPercentage}%)</span>
                  <strong>{formatMoney(taxAmount)}</strong>
                </div>
                <div className="create-bill__grand">
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
    </div>
  )
}
