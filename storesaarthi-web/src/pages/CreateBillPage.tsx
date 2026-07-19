import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { createBill, fetchBills } from '../api/bills'
import { fetchCustomers } from '../api/customers'
import { fetchProducts } from '../api/products'
import { billToPrintPayload, printBill } from '../api/print'
import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import type {
  Bill,
  CreateBillItem,
  Customer,
  PaymentMode,
  Product,
} from '../types/bill'

type CartLine = {
  key: string
  productId: string
  variantId?: string
  name: string
  unit: string
  price: number
  quantity: number
}

type BillTab = {
  id: string
  label: string
  cart: CartLine[]
  customerId: string
  discount: string
  discountType: 'flat' | 'percent'
  taxPercentage: string
  paidAmount: string
  paymentMode: PaymentMode
}

function createEmptyTab(index: number): BillTab {
  return {
    id: `bill-${Date.now()}-${index}`,
    label: `Bill ${index}`,
    cart: [],
    customerId: '',
    discount: '0',
    discountType: 'percent',
    taxPercentage: '0',
    paidAmount: '',
    paymentMode: 'CASH',
  }
}

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function lineKey(productId: string, variantId?: string) {
  return variantId ? `${productId}:${variantId}` : productId
}

export function CreateBillPage() {
  const { shop } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Multi-bill tabs
  const [tabs, setTabs] = useState<BillTab[]>([createEmptyTab(1)])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const [tabCounter, setTabCounter] = useState(2)
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]

  // Helpers to update current tab
  function updateTab(updates: Partial<BillTab>) {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)),
    )
  }

  function addNewTab() {
    const newTab = createEmptyTab(tabCounter)
    setTabCounter((c) => c + 1)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  function closeTab(tabId: string) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId)
      if (next.length === 0) {
        const fresh = createEmptyTab(tabCounter)
        setTabCounter((c) => c + 1)
        setActiveTabId(fresh.id)
        return [fresh]
      }
      if (activeTabId === tabId) {
        setActiveTabId(next[0].id)
      }
      return next
    })
  }

  function startRename(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab) {
      setRenamingTabId(tabId)
      setRenameValue(tab.label)
    }
  }

  function commitRename() {
    if (renamingTabId && renameValue.trim()) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === renamingTabId ? { ...t, label: renameValue.trim() } : t,
        ),
      )
    }
    setRenamingTabId(null)
    setRenameValue('')
  }

  // Derived from active tab
  const cart = activeTab.cart
  const customerId = activeTab.customerId
  const discount = activeTab.discount
  const discountType = activeTab.discountType
  const taxPercentage = activeTab.taxPercentage
  const paidAmount = activeTab.paidAmount
  const paymentMode = activeTab.paymentMode

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [productsRes, customersRes] = await Promise.all([
          fetchProducts(),
          fetchCustomers(),
        ])
        if (!cancelled) {
          setProducts(productsRes.products)
          setCustomers(customersRes.customers.filter((c) => !c.isSupplier))
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Failed to load products or customers',
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
  }, [])

  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState('')

  const toggleExpand = useCallback((productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }, [])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort((a, b) => a.localeCompare(b))
  }, [products])

  const filteredProducts = useMemo(() => {
    let list = products

    if (selectedCategory) {
      list = list.filter((p) => p.category === selectedCategory)
    }

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.variants || []).some((v) => v.name.toLowerCase().includes(q)),
      )
    }

    return list
  }, [products, search, selectedCategory])

  const subTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  )

  const discountInput = Math.max(Number(discount) || 0, 0)
  const discountNum =
    discountType === 'percent'
      ? (subTotal * Math.min(discountInput, 100)) / 100
      : discountInput
  const taxNum = Math.max(Number(taxPercentage) || 0, 0)
  const taxAmount = (subTotal * taxNum) / 100
  const totalAmount = Math.max(subTotal + taxAmount - discountNum, 0)

  function addProduct(product: Product, variantId?: string) {
    const variant = variantId
      ? product.variants.find((v) => v._id === variantId)
      : undefined

    const price = variant
      ? Number(variant.price.sellingPrice)
      : Number(product.price.sellingPrice)
    const name = variant ? `${product.name} (${variant.name})` : product.name
    const key = lineKey(product._id, variantId)

    updateTab({
      cart: (() => {
        const prev = activeTab.cart
        const existing = prev.find((line) => line.key === key)
        if (existing) {
          return prev.map((line) =>
            line.key === key
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        }
        return [
          ...prev,
          {
            key,
            productId: product._id,
            variantId,
            name,
            unit: product.unit || 'unit',
            price,
            quantity: 1,
          },
        ]
      })(),
    })
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) {
      updateTab({ cart: activeTab.cart.filter((line) => line.key !== key) })
      return
    }
    updateTab({
      cart: activeTab.cart.map((line) =>
        line.key === key ? { ...line, quantity } : line,
      ),
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (cart.length === 0) {
      setError('Add at least one product to the bill')
      return
    }

    const paid = paidAmount === '' ? totalAmount : Math.max(Number(paidAmount) || 0, 0)
    const mode: PaymentMode =
      paid <= 0 ? 'NONE' : paymentMode === 'NONE' ? 'CASH' : paymentMode

    const items: CreateBillItem[] = cart.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unit: line.unit,
      ...(line.variantId ? { variantId: line.variantId } : {}),
    }))

    setBusy(true)
    try {
      const res = await createBill({
        items,
        discount: discountNum,
        taxPercentage: taxNum,
        customerId: customerId || null,
        paidAmount: paid,
        paymentMode: mode,
      })

      // Print the receipt
      const bill = res.bill
      const customerName = customerId
        ? customers.find((c) => c._id === customerId)?.name || null
        : null
      const payload = billToPrintPayload(
        bill,
        shop?.shopName || 'StoreSaarthi',
        customerName,
        shop?.upiId || undefined,
      )
      let printed = false
      try {
        await printBill(bill._id, payload)
        printed = true
      } catch {
        // Printing failed silently — bill was still created successfully
      }

      // Show success toast
      setSuccessMsg(printed ? '✓ Bill Created & Printed' : '✓ Bill Created')
      setTimeout(() => setSuccessMsg(''), 3000)

      // If there are other open tabs, close this tab and stay on the page
      if (tabs.length > 1) {
        closeTab(activeTabId)
      } else {
        // Reset to a fresh tab instead of navigating away
        const fresh = createEmptyTab(tabCounter)
        setTabCounter((c) => c + 1)
        setTabs([fresh])
        setActiveTabId(fresh.id)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create bill')
    } finally {
      setBusy(false)
    }
  }

  const [showHistory, setShowHistory] = useState(false)
  const [historyBills, setHistoryBills] = useState<Bill[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)
  const [printingBillId, setPrintingBillId] = useState<string | null>(null)

  async function openHistory() {
    setShowHistory(true)
    setHistoryLoading(true)
    setExpandedBillId(null)
    try {
      const res = await fetchBills()
      setHistoryBills(res.bills)
    } catch {
      setHistoryBills([])
    } finally {
      setHistoryLoading(false)
    }
  }

  async function printHistoryBill(bill: Bill) {
    setPrintingBillId(bill._id)
    const custObj = bill.customerId && typeof bill.customerId === 'object' ? bill.customerId : null
    const customerName = custObj ? custObj.name : null
    const payload = billToPrintPayload(
      bill,
      shop?.shopName || 'StoreSaarthi',
      customerName,
      shop?.upiId || undefined,
    )
    try {
      await printBill(bill._id, payload)
      setSuccessMsg('✓ Bill Printed')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setError('Failed to print bill')
      setTimeout(() => setError(''), 3000)
    } finally {
      setPrintingBillId(null)
    }
  }

  // Get customer name for tab label
  function getTabLabel(tab: BillTab) {
    if (tab.customerId) {
      const cust = customers.find((c) => c._id === tab.customerId)
      if (cust) return cust.name
    }
    return tab.label
  }

  return (
    <DashboardLayout>
      <main className="bills-main bills-main--create">
        <div className="bills-header">
          <div>
            <h1>New bill</h1>
            <p className="dash__sub">Pick products by name — no barcode needed</p>
          </div>
          <div className="db-topbar__right">
            <button
              type="button"
              className="db-topbar__cta"
              style={{ background: 'transparent', color: '#374151', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              onClick={() => void openHistory()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Bills History
            </button>
          </div>
        </div>

        {/* Multi-bill tabs */}
        <div className="bill-tabs">
          <div className="bill-tabs__list">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`bill-tabs__tab ${tab.id === activeTabId ? 'bill-tabs__tab--active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
                onDoubleClick={() => startRename(tab.id)}
              >
                {renamingTabId === tab.id ? (
                  <input
                    className="bill-tabs__rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') {
                        setRenamingTabId(null)
                        setRenameValue('')
                      }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="bill-tabs__tab-label">{getTabLabel(tab)}</span>
                    <span
                      className="bill-tabs__tab-edit"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        startRename(tab.id)
                      }}
                      role="button"
                      aria-label={`Rename ${tab.label}`}
                    >
                      ✎
                    </span>
                  </>
                )}
                {tab.cart.length > 0 && renamingTabId !== tab.id && (
                  <>
                    <span className="bill-tabs__tab-sep">|</span>
                    <span className="bill-tabs__tab-badge">
                      {tab.cart.reduce((s, l) => s + l.quantity, 0)}
                    </span>
                  </>
                )}
                {tabs.length > 1 && renamingTabId !== tab.id && (
                  <span
                    className="bill-tabs__tab-close"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      closeTab(tab.id)
                    }}
                    role="button"
                    aria-label={`Close ${tab.label}`}
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="bill-tabs__add"
            onClick={addNewTab}
            aria-label="New bill tab"
          >
            + New bill
          </button>
        </div>

        {loading && <p className="dash__hint">Loading catalog…</p>}
        {error && <p className="auth-msg auth-msg--error">{error}</p>}
        {successMsg && (
          <div className="bill-success-toast">
            {successMsg}
          </div>
        )}

        {!loading && (
          <form className="create-bill" onSubmit={(e) => void handleSubmit(e)}>
            <section className="create-bill__products">
              <label className="create-bill__search">
                <span className="create-bill__search-label">
                  Search products
                  {search.trim() && (
                    <span className="create-bill__search-count">
                      {filteredProducts.length} found
                    </span>
                  )}
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type a product or variant name…"
                  autoFocus
                />
              </label>

              {categories.length > 0 && (
                <div className="create-bill__categories">
                  <button
                    type="button"
                    className={`create-bill__category-chip ${selectedCategory === '' ? 'create-bill__category-chip--active' : ''}`}
                    onClick={() => setSelectedCategory('')}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`create-bill__category-chip ${selectedCategory === cat ? 'create-bill__category-chip--active' : ''}`}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {filteredProducts.length === 0 ? (
                <p className="dash__hint">
                  {products.length === 0
                    ? 'No products in your shop yet. Add products from the app first.'
                    : 'No products match that search.'}
                </p>
              ) : (
                <ul className="product-picker">
                  {filteredProducts.map((product) => {
                    const activeVariants = (product.variants || []).filter(
                      (v) => v.isActive !== false,
                    )

                    if (activeVariants.length > 0) {
                      const isExpanded = expandedProducts.has(product._id)
                      return (
                        <li key={product._id} className="product-picker__group">
                          <button
                            type="button"
                            className="product-picker__item product-picker__item--parent"
                            onClick={() => toggleExpand(product._id)}
                          >
                            <span>
                              {product.name}
                              <em className="product-picker__variant-count">
                                {' '}· {activeVariants.length} variant{activeVariants.length > 1 ? 's' : ''}
                              </em>
                            </span>
                            <span className={`product-picker__chevron ${isExpanded ? 'product-picker__chevron--open' : ''}`}>
                              ▸
                            </span>
                          </button>
                          {isExpanded && (
                            <ul className="product-picker__variants">
                              {activeVariants.map((variant) => (
                                <li key={`${product._id}:${variant._id}`}>
                                  <button
                                    type="button"
                                    className="product-picker__item product-picker__item--variant"
                                    onClick={() => addProduct(product, variant._id)}
                                  >
                                    <span>{variant.name}</span>
                                    <span>{formatMoney(variant.price.sellingPrice)}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    }

                    return (
                      <li key={product._id}>
                        <button
                          type="button"
                          className="product-picker__item"
                          onClick={() => addProduct(product)}
                        >
                          <span>{product.name}</span>
                          <span>{formatMoney(product.price.sellingPrice)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="create-bill__side">
              <div className="create-bill__side-header">
                <h2>{getTabLabel(activeTab)}</h2>
                {cart.length > 0 && (
                  <span className="create-bill__cart-badge">
                    {cart.reduce((sum, l) => sum + l.quantity, 0)} item{cart.reduce((sum, l) => sum + l.quantity, 0) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="create-bill__empty-cart">
                  <p>No items yet</p>
                  <span>Tap products on the left to add them</span>
                </div>
              ) : (
                <ul className="cart-list">
                  {cart.map((line) => (
                    <li key={line.key} className="cart-line">
                      <div>
                        <p className="cart-line__name">{line.name}</p>
                        <p className="cart-line__meta">
                          {formatMoney(line.price)} / {line.unit}
                        </p>
                      </div>
                      <div className="cart-line__qty">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(line.key, line.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          value={line.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              line.key,
                              Number(e.target.value) || 0,
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(line.key, line.quantity + 1)
                          }
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <p className="cart-line__total">
                        {formatMoney(line.price * line.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="create-bill__fields auth-form">
                <label>
                  Customer (optional)
                  <select
                    value={customerId}
                    onChange={(e) => updateTab({ customerId: e.target.value })}
                  >
                    <option value="">Walk-in</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} · {c.mobileNumber}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="create-bill__row">
                  <label>
                    Discount
                    <div className="create-bill__discount-input">
                      <input
                        type="number"
                        min={0}
                        max={discountType === 'percent' ? 100 : undefined}
                        step="any"
                        value={discount}
                        onChange={(e) => updateTab({ discount: e.target.value })}
                      />
                      <div className="create-bill__discount-toggle">
                        <button
                          type="button"
                          className={`create-bill__discount-btn ${discountType === 'flat' ? 'create-bill__discount-btn--active' : ''}`}
                          onClick={() => updateTab({ discountType: 'flat' })}
                        >
                          ₹
                        </button>
                        <button
                          type="button"
                          className={`create-bill__discount-btn ${discountType === 'percent' ? 'create-bill__discount-btn--active' : ''}`}
                          onClick={() => updateTab({ discountType: 'percent' })}
                        >
                          %
                        </button>
                      </div>
                    </div>
                  </label>
                  <label>
                    Tax (%)
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={taxPercentage}
                      onChange={(e) => updateTab({ taxPercentage: e.target.value })}
                    />
                  </label>
                </div>

                <div className="create-bill__totals">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatMoney(subTotal)}</strong>
                  </div>
                  {discountNum > 0 && (
                    <div>
                      <span>Discount{discountType === 'percent' ? ` (${discountInput}%)` : ''}</span>
                      <strong>−{formatMoney(discountNum)}</strong>
                    </div>
                  )}
                  <div>
                    <span>Tax</span>
                    <strong>{formatMoney(taxAmount)}</strong>
                  </div>
                  <div className="create-bill__grand">
                    <span>Total</span>
                    <strong>{formatMoney(totalAmount)}</strong>
                  </div>
                </div>

                <label>
                  Paid amount (₹)
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={paidAmount}
                    placeholder={String(totalAmount)}
                    onChange={(e) => updateTab({ paidAmount: e.target.value })}
                  />
                </label>

                <label>
                  Payment mode
                  <select
                    value={paymentMode}
                    onChange={(e) =>
                      updateTab({ paymentMode: e.target.value as PaymentMode })
                    }
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="OTHERS">Others</option>
                    <option value="NONE">None</option>
                  </select>
                </label>

                <button
                  type="submit"
                  className="auth-btn create-bill__submit"
                  disabled={busy || cart.length === 0}
                >
                  {busy ? 'Creating…' : `Create bill · ${formatMoney(totalAmount)}`}
                </button>
              </div>
            </section>
          </form>
        )}
      </main>

      {/* Bills History Modal */}
      {showHistory && (
        <div className="bill-history-overlay" onClick={() => setShowHistory(false)}>
          <div className="bill-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bill-history-modal__header">
              <h2>Bills History</h2>
              <button
                type="button"
                className="bill-history-modal__close"
                onClick={() => setShowHistory(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="bill-history-modal__body">
              {historyLoading ? (
                <p className="dash__hint">Loading bills…</p>
              ) : historyBills.length === 0 ? (
                <p className="dash__hint">No bills yet.</p>
              ) : (
                <ul className="bill-history-list">
                  {historyBills.slice(0, 50).map((bill) => (
                    <li key={bill._id} className={`bill-history-item ${expandedBillId === bill._id ? 'bill-history-item--expanded' : ''}`}>
                      <div
                        className="bill-history-item__summary"
                        onClick={() => setExpandedBillId(expandedBillId === bill._id ? null : bill._id)}
                      >
                        <div className="bill-history-item__left">
                          <p className="bill-history-item__title">
                            Bill #{bill.dailyBillNumber}
                          </p>
                          <p className="bill-history-item__meta">
                            {new Date(bill.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' · '}
                            {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="bill-history-item__right">
                          <span className="bill-history-item__amount">
                            {formatMoney(bill.totalAmount)}
                          </span>
                          <span className={`bills-status bills-status--${bill.paymentStatus.toLowerCase()}`}>
                            {bill.paymentStatus}
                          </span>
                        </div>
                      </div>
                      {expandedBillId === bill._id && (
                        <div className="bill-history-item__detail">
                          <table className="bill-history-detail-table">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bill.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.name}</td>
                                  <td>{item.quantity} {item.unit}</td>
                                  <td>{formatMoney(item.price)}</td>
                                  <td>{formatMoney(item.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="bill-history-detail-totals">
                            <div><span>Subtotal</span><strong>{formatMoney(bill.subTotal)}</strong></div>
                            {bill.discount > 0 && (
                              <div><span>Discount</span><strong>−{formatMoney(bill.discount)}</strong></div>
                            )}
                            {bill.taxPercentage > 0 && (
                              <div><span>Tax ({bill.taxPercentage}%)</span><strong>{formatMoney((bill.subTotal * bill.taxPercentage) / 100)}</strong></div>
                            )}
                            <div className="bill-history-detail-totals__grand">
                              <span>Total</span><strong>{formatMoney(bill.totalAmount)}</strong>
                            </div>
                            <div><span>Paid</span><strong>{formatMoney(bill.paidAmount)}</strong></div>
                            <div><span>Mode</span><strong>{bill.paymentMode}</strong></div>
                          </div>
                          <button
                            type="button"
                            className="bill-history-print-btn"
                            disabled={printingBillId === bill._id}
                            onClick={() => void printHistoryBill(bill)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 6 2 18 2 18 9" />
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            {printingBillId === bill._id ? 'Printing…' : 'Print Receipt'}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
