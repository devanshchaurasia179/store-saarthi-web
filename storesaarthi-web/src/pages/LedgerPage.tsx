import { useMemo, useState } from 'react'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { Button } from '../components/ui/Button'
import { useCustomerLedger, useCustomers } from '../hooks/useLedger'
import type { Customer } from '../types/bill'
import '../styles/ledger.css'

function fmt(value: number) {
  return `₹${Number(Math.abs(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Add Customer Modal ─────────────────────────────────────────────────────

type AddCustomerModalProps = {
  onClose: () => void
  onSave: (payload: {
    name: string
    mobileNumber?: string
    isSupplier?: boolean
  }) => Promise<void>
  saving: boolean
  saveError: string
}

function AddCustomerModal({
  onClose,
  onSave,
  saving,
  saveError,
}: AddCustomerModalProps) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [isSupplier, setIsSupplier] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await onSave({
      name: name.trim(),
      mobileNumber: mobile.trim() || undefined,
      isSupplier,
    })
    onClose()
  }

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div
        className="ledger-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-customer-title"
      >
        <h2 id="add-customer-title" className="ledger-modal__title">
          Add Customer / Supplier
        </h2>
        <form onSubmit={handleSubmit} className="ledger-modal__form">
          <label className="ledger-modal__label">
            Name <span aria-hidden="true">*</span>
            <input
              className="ledger-modal__input"
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="ledger-modal__label">
            Mobile Number
            <input
              className="ledger-modal__input"
              type="tel"
              placeholder="Optional"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </label>
          <label className="ledger-modal__check">
            <input
              type="checkbox"
              checked={isSupplier}
              onChange={(e) => setIsSupplier(e.target.checked)}
            />
            Mark as Supplier
          </label>
          {saveError && (
            <p className="auth-msg auth-msg--error">{saveError}</p>
          )}
          <div className="ledger-modal__actions">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!name.trim()}>
              Add
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Transaction Modal ──────────────────────────────────────────────────────

type TxModalProps = {
  mode: 'debit' | 'credit'
  customerName: string
  onClose: () => void
  onSave: (amount: number, note: string) => Promise<void>
  saving: boolean
  saveError: string
}

function TxModal({
  mode,
  customerName,
  onClose,
  onSave,
  saving,
  saveError,
}: TxModalProps) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || num <= 0) return
    await onSave(num, note.trim())
    onClose()
  }

  const isDebit = mode === 'debit'

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div
        className="ledger-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
      >
        <h2 id="tx-modal-title" className="ledger-modal__title">
          {isDebit ? '+ Add to Khata' : '✓ Record Payment'}{' '}
          <span className="ledger-modal__sub">— {customerName}</span>
        </h2>
        <form onSubmit={handleSubmit} className="ledger-modal__form">
          <label className="ledger-modal__label">
            Amount (₹) <span aria-hidden="true">*</span>
            <input
              className="ledger-modal__input"
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="ledger-modal__label">
            Note
            <input
              className="ledger-modal__input"
              type="text"
              placeholder={isDebit ? 'e.g. Goods supplied' : 'e.g. Cash payment'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {saveError && (
            <p className="auth-msg auth-msg--error">{saveError}</p>
          )}
          <div className="ledger-modal__actions">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={!amount || parseFloat(amount) <= 0}
              variant={isDebit ? 'danger' : 'primary'}
            >
              {isDebit ? 'Add to Khata' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Ledger Detail Panel ────────────────────────────────────────────────────

type LedgerDetailProps = {
  customerId: string
  onBack: () => void
}

function LedgerDetail({ customerId, onBack }: LedgerDetailProps) {
  const { customer, entries, loading, error, saving, saveError, recordDebit, recordCredit } =
    useCustomerLedger(customerId)
  const [txModal, setTxModal] = useState<'debit' | 'credit' | null>(null)

  // Running balance (newest-first display, oldest-first for calc)
  const entriesWithBalance = useMemo(() => {
    if (!customer) return []
    // entries are newest-first from API; we compute running balance from oldest
    const reversed = [...entries].reverse()
    let running = 0
    const withBal = reversed.map((e) => {
      running += e.type === 'DEBIT' ? e.amount : -e.amount
      return { ...e, runningBalance: running }
    })
    return withBal.reverse() // back to newest-first for display
  }, [entries, customer])

  if (loading)
    return (
      <div className="ledger-detail">
        <p className="dash__hint">Loading ledger…</p>
      </div>
    )
  if (error)
    return (
      <div className="ledger-detail">
        <p className="auth-msg auth-msg--error">{error}</p>
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
      </div>
    )
  if (!customer) return null

  const isAdvance = customer.balanceType === 'ADVANCE'
  const isSettled = customer.balanceType === 'SETTLED'

  return (
    <div className="ledger-detail">
      {/* Header */}
      <div className="ledger-detail__header">
        <button className="ledger-detail__back" onClick={onBack} aria-label="Back to customers">
          ← Back
        </button>
        <div className="ledger-detail__info">
          <h2 className="ledger-detail__name">{customer.name}</h2>
          <p className="ledger-detail__mobile">
            {customer.mobileNumber}{' '}
            {customer.isSupplier && (
              <span className="ledger-badge ledger-badge--supplier">Supplier</span>
            )}
          </p>
        </div>
        <div className="ledger-detail__balance-block">
          <span
            className={`ledger-balance-pill ledger-balance-pill--${customer.balanceType.toLowerCase()}`}
          >
            {isSettled
              ? 'Settled'
              : isAdvance
                ? `Advance ${fmt(customer.advanceAmount)}`
                : `Due ${fmt(customer.totalPending)}`}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="ledger-detail__actions">
        <Button
          variant="danger"
          onClick={() => setTxModal('debit')}
          disabled={saving}
        >
          + Add to Khata
        </Button>
        <Button
          variant="primary"
          onClick={() => setTxModal('credit')}
          disabled={saving}
        >
          ✓ Record Payment
        </Button>
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="ledger-empty">
          <p>No transactions yet for this customer.</p>
          <p className="dash__hint">
            Use "Add to Khata" to record a due, or "Record Payment" to log a payment.
          </p>
        </div>
      ) : (
        <div className="ledger-entries">
          <div className="ledger-entries__header">
            <span>Date</span>
            <span>Note</span>
            <span>Debit</span>
            <span>Credit</span>
            <span>Balance</span>
          </div>
          <ul className="ledger-entries__list">
            {entriesWithBalance.map((entry) => (
              <li key={entry._id} className={`ledger-entry ledger-entry--${entry.type.toLowerCase()}`}>
                <span className="ledger-entry__date">{fmtDate(entry.createdAt)}</span>
                <span className="ledger-entry__note">
                  {entry.note || (entry.type === 'DEBIT' ? 'Bill added' : 'Payment received')}
                  {entry.billId && (
                    <span className="ledger-entry__bill-tag">📄 Bill</span>
                  )}
                </span>
                <span className="ledger-entry__debit">
                  {entry.type === 'DEBIT' ? fmt(entry.amount) : '—'}
                </span>
                <span className="ledger-entry__credit">
                  {entry.type === 'CREDIT' ? fmt(entry.amount) : '—'}
                </span>
                <span
                  className={`ledger-entry__balance ${
                    entry.runningBalance > 0
                      ? 'ledger-entry__balance--due'
                      : entry.runningBalance < 0
                        ? 'ledger-entry__balance--advance'
                        : ''
                  }`}
                >
                  {entry.runningBalance === 0
                    ? '₹0'
                    : entry.runningBalance > 0
                      ? `${fmt(entry.runningBalance)} Dr`
                      : `${fmt(entry.runningBalance)} Cr`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transaction modals */}
      {txModal && (
        <TxModal
          mode={txModal}
          customerName={customer.name}
          onClose={() => setTxModal(null)}
          saving={saving}
          saveError={saveError}
          onSave={async (amount, note) => {
            if (txModal === 'debit') {
              await recordDebit({ amount, note })
            } else {
              await recordCredit({ amount, note })
            }
          }}
        />
      )}
    </div>
  )
}

// ── Customer List ──────────────────────────────────────────────────────────

type CustomerCardProps = {
  customer: Customer
  onClick: () => void
}

function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const pending = customer.totalPending ?? 0
  const isDue = pending > 0
  const isAdvance = pending < 0

  return (
    <button className="ledger-customer-card" onClick={onClick}>
      <div className="ledger-customer-card__avatar" aria-hidden>
        {customer.name.charAt(0).toUpperCase()}
      </div>
      <div className="ledger-customer-card__info">
        <p className="ledger-customer-card__name">{customer.name}</p>
        <p className="ledger-customer-card__mobile">
          {customer.mobileNumber}
          {customer.isSupplier && (
            <span className="ledger-badge ledger-badge--supplier">Supplier</span>
          )}
        </p>
      </div>
      <div className="ledger-customer-card__balance">
        {isDue && (
          <span className="ledger-balance-pill ledger-balance-pill--due">
            Due {fmt(pending)}
          </span>
        )}
        {isAdvance && (
          <span className="ledger-balance-pill ledger-balance-pill--advance">
            Adv {fmt(pending)}
          </span>
        )}
        {!isDue && !isAdvance && (
          <span className="ledger-balance-pill ledger-balance-pill--settled">
            Settled
          </span>
        )}
      </div>
    </button>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function LedgerPage() {
  const { customers, loading, error, saving, saveError, refresh, addCustomer } =
    useCustomers()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'due' | 'advance' | 'supplier'>('all')

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.mobileNumber.includes(search)

      if (!matchSearch) return false

      if (filterType === 'due') return c.totalPending > 0
      if (filterType === 'advance') return c.totalPending < 0
      if (filterType === 'supplier') return c.isSupplier
      return true
    })
  }, [customers, search, filterType])

  // Summary stats
  const totalDue = useMemo(
    () =>
      customers
        .filter((c) => c.totalPending > 0)
        .reduce((s, c) => s + c.totalPending, 0),
    [customers],
  )

  const totalAdvance = useMemo(
    () =>
      customers
        .filter((c) => c.totalPending < 0)
        .reduce((s, c) => s + Math.abs(c.totalPending), 0),
    [customers],
  )

  if (selectedId) {
    return (
      <DashboardLayout>
        <main className="ledger-main">
          <LedgerDetail
            customerId={selectedId}
            onBack={() => setSelectedId(null)}
          />
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="ledger-main">
        {/* Page header */}
        <div className="bills-header">
          <div>
            <h1>Ledger</h1>
            <p className="dash__sub">Manage credit &amp; payments for customers and suppliers</p>
          </div>
          <div className="db-topbar__right">
            <button
              className="db-topbar__cta"
              onClick={() => setShowAddModal(true)}
            >
              ✚ Add Customer
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {!loading && customers.length > 0 && (
          <div className="ledger-summary">
            <div className="ledger-summary__card ledger-summary__card--due">
              <p className="ledger-summary__label">Total Due</p>
              <p className="ledger-summary__amount">{fmt(totalDue)}</p>
              <p className="ledger-summary__hint">
                {customers.filter((c) => c.totalPending > 0).length} customers
              </p>
            </div>
            <div className="ledger-summary__card ledger-summary__card--advance">
              <p className="ledger-summary__label">Total Advance</p>
              <p className="ledger-summary__amount">{fmt(totalAdvance)}</p>
              <p className="ledger-summary__hint">
                {customers.filter((c) => c.totalPending < 0).length} customers
              </p>
            </div>
            <div className="ledger-summary__card">
              <p className="ledger-summary__label">Total Customers</p>
              <p className="ledger-summary__amount">{customers.length}</p>
              <p className="ledger-summary__hint">
                {customers.filter((c) => c.isSupplier).length} suppliers
              </p>
            </div>
          </div>
        )}

        {/* Search + filter bar */}
        {!loading && customers.length > 0 && (
          <div className="ledger-filter-bar">
            <input
              className="ledger-filter-bar__search"
              type="search"
              placeholder="Search by name or mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search customers"
            />
            <div className="ledger-filter-bar__tabs" role="group" aria-label="Filter customers">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'due', label: 'Due' },
                  { key: 'advance', label: 'Advance' },
                  { key: 'supplier', label: 'Suppliers' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`ledger-filter-bar__tab${filterType === key ? ' ledger-filter-bar__tab--active' : ''}`}
                  onClick={() => setFilterType(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* States */}
        {loading && <p className="dash__hint">Loading customers…</p>}
        {error && (
          <div>
            <p className="auth-msg auth-msg--error">{error}</p>
            <Button variant="ghost" onClick={refresh}>
              Retry
            </Button>
          </div>
        )}

        {!loading && customers.length === 0 && (
          <div className="bills-empty">
            <p>No customers yet.</p>
            <button
              className="auth-btn"
              onClick={() => setShowAddModal(true)}
            >
              Add your first customer
            </button>
          </div>
        )}

        {!loading && customers.length > 0 && filtered.length === 0 && (
          <p className="dash__hint">No customers match your search.</p>
        )}

        {/* Customer list */}
        {!loading && filtered.length > 0 && (
          <ul className="ledger-customer-list" aria-label="Customer list">
            {filtered.map((customer) => (
              <li key={customer._id}>
                <CustomerCard
                  customer={customer}
                  onClick={() => setSelectedId(customer._id)}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Add customer modal */}
        {showAddModal && (
          <AddCustomerModal
            onClose={() => setShowAddModal(false)}
            onSave={async (payload) => { await addCustomer(payload) }}
            saving={saving}
            saveError={saveError}
          />
        )}
      </main>
    </DashboardLayout>
  )
}
