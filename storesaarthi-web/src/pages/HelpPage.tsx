import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import '../styles/help.css'

const FAQ_ITEMS = [
  {
    q: 'How do I create a new bill?',
    a: 'Go to the "New Bill" section from the sidebar, add your items, and click "Save Bill" to generate a new invoice.',
  },
  {
    q: 'How does the Print Agent work?',
    a: 'The Print Agent is a lightweight desktop app that connects your thermal printer to Store Saarthi. Download it from the Print Agent page and follow the setup instructions.',
  },
  {
    q: 'Can I edit a bill after saving?',
    a: 'Currently, bills cannot be edited once saved. You can void a bill and create a new one if corrections are needed.',
  },
  {
    q: 'How do I update my shop details?',
    a: 'Navigate to Settings from the sidebar. Click "Edit Profile" to update your shop name, UPI ID, GST number, and other details.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted in transit and stored securely on AWS infrastructure. Your billing data is private and accessible only to you.',
  },
]

export function HelpPage() {
  return (
    <DashboardLayout>
      <main className="help-page">
        {/* Header */}
        <div className="help-page__header">
          <h1 className="help-page__title">Help &amp; Support</h1>
          <p className="help-page__subtitle">
            Got questions? We're here to help you get the most out of Store Saarthi.
          </p>
        </div>

        {/* Contact card */}
        <div className="help-contact-card">
          <div className="help-contact-card__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div className="help-contact-card__body">
            <h2 className="help-contact-card__title">Call Us Directly</h2>
            <p className="help-contact-card__desc">
              Need immediate assistance? Reach out to our support team — we're happy to help.
            </p>
            <a href="tel:+919015422926" className="help-contact-card__number">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              +91 9015422926
            </a>
          </div>
        </div>

        {/* Quick help cards */}
        <div className="help-cards">
          <div className="help-card">
            <div className="help-card__icon help-card__icon--indigo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h3 className="help-card__title">Getting Started</h3>
            <p className="help-card__desc">
              New here? Set up your shop profile, add inventory, and start creating bills in minutes.
            </p>
          </div>

          <div className="help-card">
            <div className="help-card__icon help-card__icon--emerald">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
              </svg>
            </div>
            <h3 className="help-card__title">Printing Setup</h3>
            <p className="help-card__desc">
              Connect your thermal printer using our Print Agent for one-click bill printing.
            </p>
          </div>

          <div className="help-card">
            <div className="help-card__icon help-card__icon--amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3 className="help-card__title">Billing &amp; Ledger</h3>
            <p className="help-card__desc">
              Track all transactions, manage credit ledgers, and view analytics from one place.
            </p>
          </div>
        </div>

        {/* FAQ section */}
        <div className="help-faq">
          <h2 className="help-faq__title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Frequently Asked Questions
          </h2>
          <div className="help-faq__list">
            {FAQ_ITEMS.map(({ q, a }, i) => (
              <details key={i} className="help-faq__item">
                <summary className="help-faq__question">{q}</summary>
                <p className="help-faq__answer">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Support hours */}
        <div className="help-footer-card">
          <div className="help-footer-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h3 className="help-footer-card__title">Support Hours</h3>
            <p className="help-footer-card__desc">
              Monday – Saturday, 9:00 AM – 8:00 PM IST<br />
              We typically respond within a few minutes during business hours.
            </p>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
