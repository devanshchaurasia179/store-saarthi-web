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
    <div className="ldg-modal-overlay" onClick={onClose}>
      <div
        className="ldg-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-customer-title"
      >
        <div className="ldg-modal__icon ldg-modal__icon--blue">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
        <h2 id="add-customer-title" className="ldg-modal__title">
          Add Customer / Supplier
        </h2>
        <form onSubmit={handleSubmit} className="ldg-modal__form">
          <label className="ldg-modal__label">
            Name *
            <input
              className="ldg-modal__input"
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="ldg-modal__label">
            Mobile Number
            <input
              className="ldg-modal__input"
              type="tel"
              placeholder="Optional"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </label>
          <label className="ldg-modal__check">
            <input
              type="checkbox"
              checked={isSupplier}
              onChange={(e) => setIsSupplier(e.target.checked)}
            />
            Mark as Supplier
          </label>
          {saveError && (
            <div className="ldg-modal__error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {saveError}
            </div>
          )}
          <div className="ldg-modal__actions">
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
    <div className="ldg-modal-overlay" onClick={onClose}>
      <div
        className="ldg-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
      >
        <div className={`ldg-modal__icon ${isDebit ? 'ldg-modal__icon--red' : 'ldg-modal__icon--green'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isDebit ? (
              <>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </>
            ) : (
              <polyline points="20 6 9 17 4 12" />
            )}
          </svg>
        </div>
        <h2 id="tx-modal-title" className="ldg-modal__title">
          {isDebit ? 'Add to Khata' : 'Record Payment'}
          <span className="ldg-modal__sub">— {customerName}</span>
        </h2>
        <form onSubmit={handleSubmit} className="ldg-modal__form">
          <label className="ldg-modal__label">
            Amount (₹) *
            <input
              className="ldg-modal__input"
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
          <label className="ldg-modal__label">
            Note
            <input
              className="ldg-modal__input"
              type="text"
              placeholder={isDebit ? 'e.g. Goods supplied' : 'e.g. Cash payment'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {saveError && (
            <div className="ldg-modal__error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {saveError}
            </div>
          )}
          <div className="ldg-modal__actions">
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

  const entriesWithBalance = useMemo(() => {
    if (!customer) return []
    const reversed = [...entries].reverse()
    let running = 0
    const withBal = reversed.map((e) => {
      running += e.type === 'DEBIT' ? e.amount : -e.amount
      return { ...e, runningBalance: running }
    })
    return withBal.reverse()
  }, [entries, customer])

  if (loading)
    return (
      <div className="ldg-detail">
        <div className="ldg-page__loading">
          <div className="ldg-page__spinner" />
          <p>Loading ledger…</p>
        </div>
      </div>
    )
  if (error)
    return (
      <div className="ldg-detail">
        <div className="ldg-page__error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p>{error}</p>
        </div>
        <button className="ldg-detail__back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      </div>
    )
  if (!customer) return null

  const isAdvance = customer.balanceType === 'ADVANCE'
  const isSettled = customer.balanceType === 'SETTLED'
  const totalDebit = entries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0)
  const totalCredit = entries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="ldg-detail">
      {/* Back navigation */}
      <button className="ldg-detail__back-btn" onClick={onBack} aria-label="Back to customers">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Customers
      </button>

      {/* Profile card */}
      <div className="ldg-detail__profile">
        <div className="ldg-detail__profile-left">
          <div className="ldg-detail__avatar">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="ldg-detail__profile-info">
            <h2 className="ldg-detail__name">{customer.name}</h2>
            <p className="ldg-detail__mobile">
              {customer.mobileNumber}
              {customer.isSupplier && (
                <span className="ldg-badge ldg-badge--supplier">Supplier</span>
              )}
            </p>
          </div>
        </div>
        <div className="ldg-detail__profile-right">
          <span
            className={`ldg-detail__balance-badge ldg-detail__balance-badge--${customer.balanceType.toLowerCase()}`}
          >
            {isSettled
              ? '✓ Settled'
              : isAdvance
                ? `↑ Advance ${fmt(customer.advanceAmount)}`
                : `↓ Due ${fmt(customer.totalPending)}`}
          </span>
        </div>
      </div>

      {/* Summary mini-stats */}
      <div className="ldg-detail__mini-stats">
        <div className="ldg-detail__mini-stat ldg-detail__mini-stat--debit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <div>
            <span className="ldg-detail__mini-label">Total Debit</span>
            <span className="ldg-detail__mini-value">{fmt(totalDebit)}</span>
          </div>
        </div>
        <div className="ldg-detail__mini-stat ldg-detail__mini-stat--credit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            <polyline points="17 18 23 18 23 12" />
          </svg>
          <div>
            <span className="ldg-detail__mini-label">Total Credit</span>
            <span className="ldg-detail__mini-value">{fmt(totalCredit)}</span>
          </div>
        </div>
        <div className="ldg-detail__mini-stat ldg-detail__mini-stat--count">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <div>
            <span className="ldg-detail__mini-label">Transactions</span>
            <span className="ldg-detail__mini-value">{entries.length}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="ldg-detail__actions">
        <button
          className="ldg-detail__action-btn ldg-detail__action-btn--debit"
          onClick={() => setTxModal('debit')}
          disabled={saving}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add to Khata
        </button>
        <button
          className="ldg-detail__action-btn ldg-detail__action-btn--credit"
          onClick={() => setTxModal('credit')}
          disabled={saving}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Record Payment
        </button>
      </div>

      {/* Entries section */}
      <div className="ldg-detail__entries-section">
        <div className="ldg-detail__entries-title">
          <h3>Transaction History</h3>
          <span className="ldg-detail__entries-count">{entries.length} entries</span>
        </div>

        {entries.length === 0 ? (
          <div className="ldg-detail__empty">
            <div className="ldg-detail__empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="ldg-detail__empty-title">No transactions yet</p>
            <p className="ldg-detail__empty-hint">
              Use "Add to Khata" to record a due, or "Record Payment" to log a payment.
            </p>
          </div>
        ) : (
          <div className="ldg-entries">
            <div className="ldg-entries__header">
              <span>Date</span>
              <span>Note</span>
              <span>Debit</span>
              <span>Credit</span>
              <span>Balance</span>
            </div>
            <ul className="ldg-entries__list">
              {entriesWithBalance.map((entry) => (
                <li key={entry._id} className={`ldg-entry ldg-entry--${entry.type.toLowerCase()}`}>
                  <span className="ldg-entry__date">{fmtDate(entry.createdAt)}</span>
                  <span className="ldg-entry__note">
                    <span className={`ldg-entry__type-dot ldg-entry__type-dot--${entry.type.toLowerCase()}`} />
                    {entry.note || (entry.type === 'DEBIT' ? 'Bill added' : 'Payment received')}
                    {entry.billId && (
                      <span className="ldg-entry__bill-tag">📄 Bill</span>
                    )}
                  </span>
                  <span className="ldg-entry__debit">
                    {entry.type === 'DEBIT' ? fmt(entry.amount) : '—'}
                  </span>
                  <span className="ldg-entry__credit">
                    {entry.type === 'CREDIT' ? fmt(entry.amount) : '—'}
                  </span>
                  <span
                    className={`ldg-entry__balance ${
                      entry.runningBalance > 0
                        ? 'ldg-entry__balance--due'
                        : entry.runningBalance < 0
                          ? 'ldg-entry__balance--advance'
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
      </div>

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

// ── Customer Card ──────────────────────────────────────────────────────────

type CustomerCardProps = {
  customer: Customer
  onClick: () => void
}

function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const pending = customer.totalPending ?? 0
  const isDue = pending > 0
  const isAdvance = pending < 0

  return (
    <button className="ldg-customer" onClick={onClick}>
      <div className="ldg-customer__avatar" aria-hidden>
        {customer.name.charAt(0).toUpperCase()}
      </div>
      <div className="ldg-customer__info">
        <p className="ldg-customer__name">{customer.name}</p>
        <p className="ldg-customer__mobile">
          {customer.mobileNumber}
          {customer.isSupplier && (
            <span className="ldg-badge ldg-badge--supplier">Supplier</span>
          )}
        </p>
      </div>
      <div className="ldg-customer__balance">
        {isDue && (
          <span className="ldg-balance-pill ldg-balance-pill--due">
            Due {fmt(pending)}
          </span>
        )}
        {isAdvance && (
          <span className="ldg-balance-pill ldg-balance-pill--advance">
            Adv {fmt(pending)}
          </span>
        )}
        {!isDue && !isAdvance && (
          <span className="ldg-balance-pill ldg-balance-pill--settled">
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
        <main className="ldg-page">
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
      <main className="ldg-page">
        {/* Header */}
        <div className="ldg-page__header">
          <div className="ldg-page__header-left">
            <h1 className="ldg-page__title">Ledger</h1>
            <p className="ldg-page__subtitle">Manage credit &amp; payments for customers and suppliers</p>
          </div>
          <div className="ldg-page__header-right">
            <button className="ldg-page__add-btn" onClick={() => setShowAddModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Customer
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {!loading && customers.length > 0 && (
          <div className="ldg-page__stats">
            <div className="ldg-page__stat">
              <div className="ldg-page__stat-icon ldg-page__stat-icon--red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div className="ldg-page__stat-content">
                <span className="ldg-page__stat-label">Total Due</span>
                <span className="ldg-page__stat-value ldg-page__stat-value--red">{fmt(totalDue)}</span>
                <span className="ldg-page__stat-hint">{customers.filter((c) => c.totalPending > 0).length} customers</span>
              </div>
            </div>
            <div className="ldg-page__stat">
              <div className="ldg-page__stat-icon ldg-page__stat-icon--green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
              </div>
              <div className="ldg-page__stat-content">
                <span className="ldg-page__stat-label">Total Advance</span>
                <span className="ldg-page__stat-value ldg-page__stat-value--green">{fmt(totalAdvance)}</span>
                <span className="ldg-page__stat-hint">{customers.filter((c) => c.totalPending < 0).length} customers</span>
              </div>
            </div>
            <div className="ldg-page__stat">
              <div className="ldg-page__stat-icon ldg-page__stat-icon--blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="ldg-page__stat-content">
                <span className="ldg-page__stat-label">Total Customers</span>
                <span className="ldg-page__stat-value">{customers.length}</span>
                <span className="ldg-page__stat-hint">{customers.filter((c) => c.isSupplier).length} suppliers</span>
              </div>
            </div>
          </div>
        )}

        {/* Search + filter */}
        {!loading && customers.length > 0 && (
          <div className="ldg-page__toolbar">
            <div className="ldg-page__search">
              <svg className="ldg-page__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="ldg-page__search-input"
                type="search"
                placeholder="Search by name or mobile…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search customers"
              />
              {search && (
                <button className="ldg-page__search-clear" onClick={() => setSearch('')} aria-label="Clear search">×</button>
              )}
            </div>
            <div className="ldg-page__filters" role="group" aria-label="Filter customers">
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
                  className={`ldg-page__filter-chip${filterType === key ? ' ldg-page__filter-chip--active' : ''}`}
                  onClick={() => setFilterType(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="ldg-page__loading">
            <div className="ldg-page__spinner" />
            <p>Loading customers…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="ldg-page__error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p>{error}</p>
            <button className="ldg-page__retry-btn" onClick={refresh}>Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && customers.length === 0 && (
          <div className="ldg-page__empty">
            <div className="ldg-page__empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>No customers yet</h3>
            <p>Add your first customer to start managing credit and payments</p>
            <button className="ldg-page__empty-cta" onClick={() => setShowAddModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add your first customer
            </button>
          </div>
        )}

        {/* No results */}
        {!loading && customers.length > 0 && filtered.length === 0 && (
          <div className="ldg-page__no-results">
            <p>No customers match your search.</p>
            <button className="ldg-page__no-results-btn" onClick={() => { setSearch(''); setFilterType('all') }}>
              Clear filters
            </button>
          </div>
        )}

        {/* Customer list */}
        {!loading && filtered.length > 0 && (
          <ul className="ldg-page__list" aria-label="Customer list">
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
