import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createBill } from '../api/bills'
import { fetchCustomers } from '../api/customers'
import { fetchProducts } from '../api/products'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import type {
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
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerId, setCustomerId] = useState('')
  const [discount, setDiscount] = useState('0')
  const [taxPercentage, setTaxPercentage] = useState('0')
  const [paidAmount, setPaidAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const subTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  )

  const discountNum = Math.max(Number(discount) || 0, 0)
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

    setCart((prev) => {
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
    })
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((line) => line.key !== key))
      return
    }
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, quantity } : line)),
    )
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
      navigate(`/bills/${res.bill._id}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create bill')
    } finally {
      setBusy(false)
    }
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
            <Link to="/bills" className="db-topbar__cta" style={{ background: 'transparent', color: '#374151', border: '1px solid #e5e7eb' }}>
              ← Bills
            </Link>
          </div>
        </div>

        {loading && <p className="dash__hint">Loading catalog…</p>}
        {error && <p className="auth-msg auth-msg--error">{error}</p>}

        {!loading && (
          <form className="create-bill" onSubmit={(e) => void handleSubmit(e)}>
            <section className="create-bill__products">
              <label className="create-bill__search">
                Search products
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type a product name"
                  autoFocus
                />
              </label>

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
                      return activeVariants.map((variant) => (
                        <li key={`${product._id}:${variant._id}`}>
                          <button
                            type="button"
                            className="product-picker__item"
                            onClick={() => addProduct(product, variant._id)}
                          >
                            <span>
                              {product.name}
                              <em> · {variant.name}</em>
                            </span>
                            <span>
                              {formatMoney(variant.price.sellingPrice)}
                            </span>
                          </button>
                        </li>
                      ))
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
              <h2>This bill</h2>

              {cart.length === 0 ? (
                <p className="dash__hint">Tap products on the left to add them.</p>
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
                    onChange={(e) => setCustomerId(e.target.value)}
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
                    Discount (₹)
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </label>
                  <label>
                    Tax (%)
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(e.target.value)}
                    />
                  </label>
                </div>

                <div className="create-bill__totals">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatMoney(subTotal)}</strong>
                  </div>
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
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </label>

                <label>
                  Payment mode
                  <select
                    value={paymentMode}
                    onChange={(e) =>
                      setPaymentMode(e.target.value as PaymentMode)
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
                  className="auth-btn"
                  disabled={busy || cart.length === 0}
                >
                  {busy ? 'Creating…' : 'Create bill'}
                </button>
              </div>
            </section>
          </form>
        )}
      </main>
    </DashboardLayout>
  )
}
