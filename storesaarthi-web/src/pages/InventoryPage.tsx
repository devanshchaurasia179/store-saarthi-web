import { useState, useMemo, useRef, useEffect } from 'react'
import { useInventory } from '../hooks/useInventory'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import type {
  CreateProductPayload,
  InventoryProduct,
  ProductUnit,
  UpdateProductPayload,
  VariantPayload,
} from '../types/inventory'
import { PRODUCT_UNITS } from '../types/inventory'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function stockLabel(product: InventoryProduct) {
  if (!product.isTrackable) return null
  if (product.variants.length > 0) {
    const total = product.variants
      .filter((v) => v.isActive)
      .reduce((s, v) => s + v.quantity, 0)
    return total
  }
  return product.quantity
}

// ─── empty form state ────────────────────────────────────────────────────────

type FormState = {
  name: string
  barcode: string
  category: string
  unit: ProductUnit
  sellingPrice: string
  quantity: string
  expiryDate: string
  isTrackable: boolean
  isBarcodeListed: boolean
  variants: VariantPayload[]
}

const EMPTY_FORM: FormState = {
  name: '',
  barcode: '',
  category: '',
  unit: 'unit',
  sellingPrice: '',
  quantity: '',
  expiryDate: '',
  isTrackable: true,
  isBarcodeListed: false,
  variants: [],
}

function formToPayload(f: FormState): CreateProductPayload {
  return {
    name: f.name.trim(),
    barcode: f.barcode.trim(),
    category: f.category.trim() || 'Other',
    unit: f.unit,
    price: { sellingPrice: parseFloat(f.sellingPrice) || 0 },
    quantity: parseInt(f.quantity, 10) || 0,
    expiryDate: f.expiryDate || null,
    isTrackable: f.isTrackable,
    isBarcodeListed: f.isBarcodeListed,
    variants: f.variants,
  }
}

function productToForm(p: InventoryProduct): FormState {
  return {
    name: p.name,
    barcode: p.barcode,
    category: p.category ?? '',
    unit: p.unit,
    sellingPrice: String(p.price.sellingPrice),
    quantity: String(p.quantity),
    expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
    isTrackable: p.isTrackable,
    isBarcodeListed: p.isBarcodeListed,
    variants: p.variants.map((v) => ({
      name: v.name,
      barcode: v.barcode ?? undefined,
      price: { sellingPrice: v.price.sellingPrice },
      quantity: v.quantity,
      isActive: v.isActive,
    })),
  }
}

// ─── variant row sub-component ───────────────────────────────────────────────

type VariantRowProps = {
  variant: VariantPayload
  index: number
  onChange: (index: number, next: VariantPayload) => void
  onRemove: (index: number) => void
}

function VariantRow({ variant, index, onChange, onRemove }: VariantRowProps) {
  return (
    <div className="inv-variant-row">
      <input
        className="inv-input"
        placeholder="Variant name e.g. 500ml"
        value={variant.name}
        onChange={(e) => onChange(index, { ...variant, name: e.target.value })}
        required
        aria-label={`Variant ${index + 1} name`}
      />
      <input
        className="inv-input"
        placeholder="Price (₹)"
        type="number"
        min="0"
        step="0.01"
        value={variant.price.sellingPrice === 0 ? '' : variant.price.sellingPrice}
        onChange={(e) =>
          onChange(index, {
            ...variant,
            price: { sellingPrice: parseFloat(e.target.value) || 0 },
          })
        }
        required
        aria-label={`Variant ${index + 1} price`}
      />
      <input
        className="inv-input"
        placeholder="Qty"
        type="number"
        min="0"
        value={variant.quantity ?? ''}
        onChange={(e) =>
          onChange(index, { ...variant, quantity: parseInt(e.target.value, 10) || 0 })
        }
        aria-label={`Variant ${index + 1} quantity`}
      />
      <input
        className="inv-input"
        placeholder="Barcode (optional)"
        value={variant.barcode ?? ''}
        onChange={(e) => onChange(index, { ...variant, barcode: e.target.value || undefined })}
        aria-label={`Variant ${index + 1} barcode`}
      />
      <button
        type="button"
        className="inv-remove-btn"
        onClick={() => onRemove(index)}
        aria-label={`Remove variant ${index + 1}`}
      >
        ✕
      </button>
    </div>
  )
}

// ─── product drawer (add / edit) ─────────────────────────────────────────────

type DrawerProps = {
  mode: 'add' | 'edit'
  initialForm: FormState
  saving: boolean
  saveError: string
  onClose: () => void
  onSubmit: (form: FormState) => void
}

function ProductDrawer({ mode, initialForm, saving, saveError, onClose, onSubmit }: DrawerProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(initialForm)
    // slight delay so the drawer is visible before focusing
    const t = setTimeout(() => firstInputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [initialForm])

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function handleVariantChange(idx: number, next: VariantPayload) {
    setForm((f) => {
      const variants = [...f.variants]
      variants[idx] = next
      return { ...f, variants }
    })
  }

  function handleVariantRemove(idx: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))
  }

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { name: '', price: { sellingPrice: 0 }, quantity: 0 }],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const title = mode === 'add' ? 'Add product' : 'Edit product'

  return (
    <div className="inv-drawer-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="inv-drawer">
        <div className="inv-drawer__head">
          <h2>{title}</h2>
          <button
            type="button"
            className="inv-icon-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        <form className="inv-drawer__body" onSubmit={handleSubmit} noValidate>
          {/* name */}
          <label className="inv-label">
            Product name *
            <input
              ref={firstInputRef}
              className="inv-input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Tata Salt"
              required
            />
          </label>

          {/* barcode */}
          <label className="inv-label">
            Barcode *
            <input
              className="inv-input"
              value={form.barcode}
              onChange={(e) => set('barcode', e.target.value)}
              placeholder="Scan or type barcode"
              required
            />
          </label>

          {/* category */}
          <label className="inv-label">
            Category
            <input
              className="inv-input"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="e.g. Dairy, Snacks…"
            />
          </label>

          {/* price + unit */}
          <div className="inv-form-row">
            <label className="inv-label">
              Selling price (₹) *
              <input
                className="inv-input"
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => set('sellingPrice', e.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label className="inv-label">
              Unit
              <select
                className="inv-input"
                value={form.unit}
                onChange={(e) => set('unit', e.target.value as ProductUnit)}
              >
                {PRODUCT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* quantity + expiry */}
          <div className="inv-form-row">
            <label className="inv-label">
              Quantity
              <input
                className="inv-input"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="inv-label">
              Expiry date
              <input
                className="inv-input"
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
              />
            </label>
          </div>

          {/* toggles */}
          <div className="inv-toggles">
            <label className="inv-toggle">
              <input
                type="checkbox"
                checked={form.isTrackable}
                onChange={(e) => set('isTrackable', e.target.checked)}
              />
              Track stock
            </label>
            <label className="inv-toggle">
              <input
                type="checkbox"
                checked={form.isBarcodeListed}
                onChange={(e) => set('isBarcodeListed', e.target.checked)}
              />
              Listed in catalogue
            </label>
          </div>

          {/* variants */}
          <div className="inv-variants">
            <div className="inv-variants__head">
              <p className="inv-label-text">Variants</p>
              <button type="button" className="inv-add-variant-btn" onClick={addVariant}>
                + Add variant
              </button>
            </div>
            {form.variants.length > 0 && (
              <div className="inv-variants__list">
                {form.variants.map((v, i) => (
                  <VariantRow
                    key={i}
                    variant={v}
                    index={i}
                    onChange={handleVariantChange}
                    onRemove={handleVariantRemove}
                  />
                ))}
              </div>
            )}
          </div>

          {saveError && (
            <p className="auth-msg auth-msg--error" role="alert">
              {saveError}
            </p>
          )}

          <div className="inv-drawer__footer">
            <button
              type="button"
              className="auth-btn auth-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="auth-btn" disabled={saving}>
              {saving ? 'Saving…' : mode === 'add' ? 'Add product' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── delete confirm modal ────────────────────────────────────────────────────

type DeleteModalProps = {
  product: InventoryProduct
  saving: boolean
  saveError: string
  onCancel: () => void
  onConfirm: () => void
}

function DeleteModal({ product, saving, saveError, onCancel, onConfirm }: DeleteModalProps) {
  return (
    <div className="inv-drawer-overlay" role="dialog" aria-modal="true" aria-label="Delete product">
      <div className="inv-modal">
        <h2>Delete product?</h2>
        <p className="inv-modal__body">
          <strong>{product.name}</strong> will be permanently removed from your inventory. This
          cannot be undone.
        </p>
        {saveError && (
          <p className="auth-msg auth-msg--error" role="alert">
            {saveError}
          </p>
        )}
        <div className="inv-modal__actions">
          <button
            type="button"
            className="auth-btn auth-btn--ghost"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="auth-btn auth-btn--danger"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── product card ────────────────────────────────────────────────────────────

type ProductCardProps = {
  product: InventoryProduct
  onEdit: (p: InventoryProduct) => void
  onDelete: (p: InventoryProduct) => void
}

function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const stock = stockLabel(product)
  const hasVariants = product.variants.length > 0

  return (
    <li className="inv-card">
      <div className="inv-card__main">
        <div className="inv-card__info">
          <p className="inv-card__name">{product.name}</p>
          <p className="inv-card__meta">
            {product.barcode}
            {product.category && product.category !== 'Other' ? ` · ${product.category}` : ''}
            {' · '}
            {product.unit}
          </p>
        </div>

        <div className="inv-card__right">
          {hasVariants ? (
            <p className="inv-card__price">
              {fmt(Math.min(...product.variants.map((v) => v.price.sellingPrice)))}
              {' – '}
              {fmt(Math.max(...product.variants.map((v) => v.price.sellingPrice)))}
            </p>
          ) : (
            <p className="inv-card__price">{fmt(product.price.sellingPrice)}</p>
          )}

          {stock !== null && (
            <span
              className={`inv-stock inv-stock--${stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok'}`}
            >
              {stock === 0 ? 'Out of stock' : `${stock} left`}
            </span>
          )}
        </div>
      </div>

      {hasVariants && (
        <ul className="inv-card__variants">
          {product.variants
            .filter((v) => v.isActive)
            .map((v) => (
              <li key={v._id} className="inv-card__variant-chip">
                {v.name} · {fmt(v.price.sellingPrice)}
                {product.isTrackable ? ` · ${v.quantity}` : ''}
              </li>
            ))}
        </ul>
      )}

      <div className="inv-card__actions">
        <button
          type="button"
          className="inv-action-btn"
          onClick={() => onEdit(product)}
          aria-label={`Edit ${product.name}`}
        >
          Edit
        </button>
        <button
          type="button"
          className="inv-action-btn inv-action-btn--danger"
          onClick={() => onDelete(product)}
          aria-label={`Delete ${product.name}`}
        >
          Delete
        </button>
      </div>
    </li>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export function InventoryPage() {
  const { products, loading, error, saving, saveError, refresh, addProduct, editProduct, removeProduct } =
    useInventory()

  const [search, setSearch] = useState('')
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<InventoryProduct | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryProduct | null>(null)

  // derived list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q),
    )
  }, [products, search])

  // stats
  const totalProducts = products.length
  const outOfStock = products.filter(
    (p) => p.isTrackable && !p.variants.length && p.quantity === 0,
  ).length
  const lowStock = products.filter(
    (p) => p.isTrackable && !p.variants.length && p.quantity > 0 && p.quantity <= 5,
  ).length

  // drawer actions
  function openAdd() {
    setEditTarget(null)
    setDrawerMode('add')
  }

  function openEdit(p: InventoryProduct) {
    setEditTarget(p)
    setDrawerMode('edit')
  }

  function closeDrawer() {
    setDrawerMode(null)
    setEditTarget(null)
  }

  async function handleSubmit(form: FormState) {
    const payload = formToPayload(form)
    try {
      if (drawerMode === 'add') {
        await addProduct(payload as CreateProductPayload)
      } else if (editTarget) {
        await editProduct(editTarget._id, payload as UpdateProductPayload)
      }
      closeDrawer()
    } catch {
      // saveError already set by the hook
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await removeProduct(deleteTarget._id)
      setDeleteTarget(null)
    } catch {
      // saveError already set by the hook
    }
  }

  const drawerForm = editTarget ? productToForm(editTarget) : EMPTY_FORM

  return (
    <DashboardLayout>
      <main className="inv-main">
        {/* page title */}
        <div className="bills-header">
          <div>
            <h1>Inventory</h1>
            <p className="dash__sub">Manage your products and stock levels</p>
          </div>
          <div className="db-topbar__right">
            <button type="button" className="db-topbar__cta" onClick={openAdd}>
              + Add product
            </button>
          </div>
        </div>

        {/* summary cards */}
        {!loading && !error && (
          <div className="inv-stats">
            <div className="inv-stat">
              <span className="inv-stat__value">{totalProducts}</span>
              <span className="inv-stat__label">Total products</span>
            </div>
            <div className="inv-stat inv-stat--warn">
              <span className="inv-stat__value">{lowStock}</span>
              <span className="inv-stat__label">Low stock</span>
            </div>
            <div className="inv-stat inv-stat--danger">
              <span className="inv-stat__value">{outOfStock}</span>
              <span className="inv-stat__label">Out of stock</span>
            </div>
          </div>
        )}

        {/* search */}
        <div className="inv-search-wrap">
          <input
            className="inv-search"
            type="search"
            placeholder="Search by name, barcode or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>

        {/* states */}
        {loading && <p className="dash__hint">Loading inventory…</p>}
        {error && (
          <div className="auth-msg auth-msg--error">
            {error}
            <button
              type="button"
              className="auth-link"
              style={{ marginLeft: 12 }}
              onClick={refresh}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="bills-empty">
            {products.length === 0 ? (
              <>
                <p>No products yet.</p>
                <button type="button" className="auth-btn" onClick={openAdd}>
                  Add your first product
                </button>
              </>
            ) : (
              <p>No products match "{search}".</p>
            )}
          </div>
        )}

        {/* list */}
        {!loading && filtered.length > 0 && (
          <ul className="inv-list">
            {filtered.map((p) => (
              <ProductCard key={p._id} product={p} onEdit={openEdit} onDelete={setDeleteTarget} />
            ))}
          </ul>
        )}
      </main>

      {/* add / edit drawer */}
      {drawerMode && (
        <ProductDrawer
          mode={drawerMode}
          initialForm={drawerForm}
          saving={saving}
          saveError={saveError}
          onClose={closeDrawer}
          onSubmit={handleSubmit}
        />
      )}

      {/* delete modal */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          saving={saving}
          saveError={saveError}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </DashboardLayout>
  )
}
