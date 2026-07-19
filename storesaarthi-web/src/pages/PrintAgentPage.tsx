import { useState } from 'react'
import {
  Download,
  Terminal,
  CheckCircle2,
  Printer,
  Play,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { Card } from '../components/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = 'done' | 'active' | 'upcoming'

interface Step {
  id: number
  icon: React.ReactNode
  title: string
  description: string
  content: React.ReactNode
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ children, variant = 'default' }: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning'
}) {
  const cls = {
    default: 'bg-primary-soft text-primary border-primary/20',
    success: 'bg-success-bg text-success border-success/20',
    warning: 'bg-warning-bg text-warning border-warning/20',
  }[variant]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-heading font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  )
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(children).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="pa-code">
      <code className="pa-code__text">{children}</code>
      <button
        type="button"
        className="pa-code__copy"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}

function StepBubble({ number, status }: { number: number; status: StepStatus }) {
  if (status === 'done') {
    return (
      <span className="pa-step__bubble pa-step__bubble--done" aria-label="Completed">
        <CheckCircle2 size={16} strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span className={`pa-step__bubble${status === 'active' ? ' pa-step__bubble--active' : ''}`}>
      {number}
    </span>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string
  a: React.ReactNode
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Which Windows versions are supported?',
    a: 'Windows 7, 8.1, 10, and 11 — both 32-bit (x86) and 64-bit (x64). Windows 8.0 is not supported; upgrade to 8.1 first via Windows Update.',
  },
  {
    q: 'Do I need to install Node.js separately?',
    a: 'No. The print agent is a self-contained .exe bundled with Node.js inside. Just download and run — no extra installs.',
  },
  {
    q: "Why does it ask me to 'Run as Administrator'?",
    a: 'Installing a Windows Service requires admin rights. Once installed the service runs automatically on every boot without any user interaction.',
  },
  {
    q: 'My printer is not in the list — what do I do?',
    a: (
      <>
        Make sure your thermal printer is installed in Windows first:{' '}
        <strong>Settings → Bluetooth &amp; devices → Printers &amp; scanners</strong>.
        Add it there, then re-run <code>print-agent.exe</code>.
      </>
    ),
  },
  {
    q: 'How do I check if the agent is running?',
    a: (
      <>
        Open a browser and visit{' '}
        <code>http://localhost:4000</code>. You should see a JSON response with{' '}
        <code>"success": true</code> and the configured printer name.
      </>
    ),
  },
  {
    q: 'How do I uninstall the print agent?',
    a: (
      <>
        Right-click <code>uninstall-service.bat</code> and choose{' '}
        <strong>Run as administrator</strong>. Then delete the{' '}
        <code>C:\print-agent\</code> folder.
      </>
    ),
  },
]

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="pa-faq">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className={`pa-faq__item${open === i ? ' pa-faq__item--open' : ''}`}>
          <button
            type="button"
            className="pa-faq__q"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span>{item.q}</span>
            {open === i ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
          </button>
          {open === i && <div className="pa-faq__a">{item.a}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PrintAgentPage() {
  const [activeStep, setActiveStep] = useState(1)

  function stepStatus(id: number): StepStatus {
    if (id < activeStep) return 'done'
    if (id === activeStep) return 'active'
    return 'upcoming'
  }

  const steps: Step[] = [
    {
      id: 1,
      icon: <Download size={18} strokeWidth={2} />,
      title: 'Download the installer',
      description: 'Get the correct version for your Windows machine',
      content: (
        <div className="pa-step__body">
          <p className="pa-step__text">
            Download the zip below — it contains the print agent exe, install scripts, and the 32-bit
            fallback. No Node.js or extra software needed.
          </p>

          <div className="pa-download-grid">
            <a href="/install-service.zip" download className="pa-download-card">
              <span className="pa-download-card__icon" aria-hidden>📦</span>
              <div className="pa-download-card__info">
                <p className="pa-download-card__name">install-service.zip</p>
                <p className="pa-download-card__hint">Contains print-agent exe, install &amp; uninstall scripts</p>
              </div>
              <Badge variant="success">
                <Download size={11} strokeWidth={2.5} />
                Download All
              </Badge>
            </a>
          </div>

          <div className="pa-tip">
            <AlertTriangle size={14} strokeWidth={2} className="pa-tip__icon" />
            <p>
              The zip contains both 64-bit (<code>.exe</code>) and 32-bit (<code>.bat</code>) versions.
              Most computers made after 2010 are 64-bit. Check via <strong>Settings → System → About</strong> and look for "System type".
            </p>
          </div>

          <div className="pa-step__footer">
            <button type="button" className="pa-btn" onClick={() => setActiveStep(2)}>
              Next: Run first-time setup →
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      icon: <Play size={18} strokeWidth={2} />,
      title: 'Run first-time setup',
      description: 'Select your thermal printer',
      content: (
        <div className="pa-step__body">
          <p className="pa-step__text">
            Before installing as a service, run the exe once from a Command Prompt to pick your printer.
            This creates the <code>config.json</code> the service needs.
          </p>

          <ol className="pa-list">
            <li>
              <span className="pa-list__num">1</span>
              <div>
                Move the downloaded <code>.exe</code> to <code>C:\print-agent\</code>{' '}
                (create the folder if it doesn't exist).
              </div>
            </li>
            <li>
              <span className="pa-list__num">2</span>
              <div>
                Open <strong>Command Prompt</strong> as Administrator and run:
                <CodeBlock>C:\print-agent\print-agent-x64.exe</CodeBlock>
                <span className="pa-step__subhint">Use <code>print-agent-x86.exe</code> if you downloaded the 32-bit version.</span>
              </div>
            </li>
            <li>
              <span className="pa-list__num">3</span>
              <div>
                The agent lists all installed printers. Type the number next to your thermal printer and press <kbd>Enter</kbd>.
              </div>
            </li>
            <li>
              <span className="pa-list__num">4</span>
              <div>
                A <code>config.json</code> is saved to <code>C:\print-agent\</code> and the server starts.
                Leave this window open for now.
              </div>
            </li>
          </ol>

          <div className="pa-callout">
            <CheckCircle2 size={14} strokeWidth={2} className="pa-callout__icon" />
            <div>
              <p className="pa-callout__title">Verify it's working</p>
              <p>
                Open your browser and go to{' '}
                <a href="http://localhost:4000" target="_blank" rel="noreferrer" className="pa-link">
                  http://localhost:4000 <ExternalLink size={11} strokeWidth={2} />
                </a>
                . You should see a JSON response showing your printer name.
              </p>
            </div>
          </div>

          <div className="pa-step__footer">
            <button type="button" className="pa-btn pa-btn--ghost" onClick={() => setActiveStep(1)}>
              ← Back
            </button>
            <button type="button" className="pa-btn" onClick={() => setActiveStep(3)}>
              Next: Install as a service →
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      icon: <Terminal size={18} strokeWidth={2} />,
      title: 'Install as a Windows Service',
      description: 'Runs automatically on every boot — no window needed',
      content: (
        <div className="pa-step__body">
          <p className="pa-step__text">
            The installer script sets up a Windows Service using NSSM so the print agent starts
            silently in the background whenever Windows boots — no need to keep a window open.
          </p>

          <ol className="pa-list">
            <li>
              <span className="pa-list__num">1</span>
              <div>
                From the downloaded <code>install-service.zip</code>, extract{' '}
                <code>install-service.bat</code> and <code>uninstall-service.bat</code> into{' '}
                <code>C:\print-agent\</code>.
              </div>
            </li>
            <li>
              <span className="pa-list__num">2</span>
              <div>
                <strong>Right-click</strong> <code>install-service.bat</code> and choose{' '}
                <strong>"Run as administrator"</strong>.
              </div>
            </li>
            <li>
              <span className="pa-list__num">3</span>
              <div>
                The script will:
                <ul className="pa-sublist">
                  <li>Check your PowerShell version (upgrades automatically on Win 7/8.1)</li>
                  <li>Download NSSM (the service manager)</li>
                  <li>Install and start the <strong>PrintAgent</strong> Windows Service</li>
                  <li>Run a health check at <code>http://localhost:4000</code></li>
                </ul>
              </div>
            </li>
            <li>
              <span className="pa-list__num">4</span>
              <div>
                When you see <code>[OK] Health check passed</code> — you're done. ✓
              </div>
            </li>
          </ol>

          <div className="pa-tip">
            <AlertTriangle size={14} strokeWidth={2} className="pa-tip__icon" />
            <p>
              On Windows 7 / 8.1 the script may need to install Windows Management Framework 5.1 and
              restart your computer first. After restarting, run the script again as Administrator — it
              will pick up where it left off.
            </p>
          </div>

          <div className="pa-step__footer">
            <button type="button" className="pa-btn pa-btn--ghost" onClick={() => setActiveStep(2)}>
              ← Back
            </button>
            <button type="button" className="pa-btn" onClick={() => setActiveStep(4)}>
              Next: Test printing →
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      icon: <Printer size={18} strokeWidth={2} />,
      title: 'Test printing',
      description: 'Print a test receipt to confirm everything works',
      content: (
        <div className="pa-step__body">
          <p className="pa-step__text">
            Send a test print to make sure the agent is communicating with your printer correctly.
          </p>

          <ol className="pa-list">
            <li>
              <span className="pa-list__num">1</span>
              <div>
                Make sure your thermal printer is powered on and loaded with paper.
              </div>
            </li>
            <li>
              <span className="pa-list__num">2</span>
              <div>
                Run the following command in Command Prompt or PowerShell:
                <CodeBlock>curl -X POST http://localhost:4000/print-test</CodeBlock>
              </div>
            </li>
            <li>
              <span className="pa-list__num">3</span>
              <div>
                A test receipt should print. If it does — the agent is fully set up.
              </div>
            </li>
          </ol>

          <div className="pa-callout pa-callout--success">
            <ShieldCheck size={14} strokeWidth={2} className="pa-callout__icon" />
            <div>
              <p className="pa-callout__title">All set!</p>
              <p>
                The print agent starts automatically with Windows. You can now print bills directly
                from StoreSaarthi — no browser print dialog, instant receipts.
              </p>
            </div>
          </div>

          <div className="pa-step__footer">
            <button type="button" className="pa-btn pa-btn--ghost" onClick={() => setActiveStep(3)}>
              ← Back
            </button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      {/* ── Page header ── */}
      <div className="pa-header">
        <div className="pa-header__icon" aria-hidden>
          <Printer size={24} strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-heading">
            Print Agent Setup
          </h1>
          <p className="font-body text-sm text-muted mt-1">
            Install the StoreSaarthi Print Agent on your Windows PC to print thermal receipts directly.
          </p>
        </div>
        <div className="pa-header__badges">
          <Badge variant="success">
            <CheckCircle2 size={11} strokeWidth={2.5} />
            Windows 7–11
          </Badge>
          <Badge>32-bit &amp; 64-bit</Badge>
        </div>
      </div>

      <div className="pa-layout">
        {/* ── Steps ── */}
        <div className="pa-steps-col">
          {steps.map((step) => {
            const status = stepStatus(step.id)
            const isOpen = status === 'active'
            return (
              <Card
                key={step.id}
                className={`pa-step${isOpen ? ' pa-step--active' : ''}${status === 'done' ? ' pa-step--done' : ''}`}
              >
                <button
                  type="button"
                  className="pa-step__header"
                  onClick={() => setActiveStep(step.id)}
                  aria-expanded={isOpen}
                >
                  <StepBubble number={step.id} status={status} />
                  <div className="pa-step__meta">
                    <span className="pa-step__title">{step.title}</span>
                    <span className="pa-step__desc">{step.description}</span>
                  </div>
                  <span className="pa-step__icon-end" aria-hidden>
                    {step.icon}
                  </span>
                </button>
                {isOpen && step.content}
              </Card>
            )
          })}
        </div>

        {/* ── Right sidebar ── */}
        <aside className="pa-sidebar">
          {/* Requirements */}
          <Card>
            <p className="font-heading text-sm font-semibold text-heading mb-3">Requirements</p>
            <ul className="pa-req-list">
              <li><CheckCircle2 size={13} strokeWidth={2.5} className="text-success shrink-0" /> Windows 7 SP1 or later</li>
              <li><CheckCircle2 size={13} strokeWidth={2.5} className="text-success shrink-0" /> 32-bit or 64-bit</li>
              <li><CheckCircle2 size={13} strokeWidth={2.5} className="text-success shrink-0" /> Thermal printer installed in Windows</li>
              <li><CheckCircle2 size={13} strokeWidth={2.5} className="text-success shrink-0" /> Administrator account</li>
              <li><CheckCircle2 size={13} strokeWidth={2.5} className="text-success shrink-0" /> Internet connection (for first-time install)</li>
            </ul>
          </Card>

          {/* Download zip */}
          <Card>
            <p className="font-heading text-sm font-semibold text-heading mb-3">Download</p>
            <a href="/install-service.zip" download className="pa-qdl">
              <Download size={14} strokeWidth={2} />
              install-service.zip
            </a>
            <p className="font-body text-xs text-muted mt-2">
              All files needed for setup in one zip.
            </p>
          </Card>

          {/* Health check */}
          <Card>
            <p className="font-heading text-sm font-semibold text-heading mb-1">Check Status</p>
            <p className="font-body text-xs text-muted mb-3">
              Once installed, verify the agent is running:
            </p>
            <a
              href="http://localhost:4000"
              target="_blank"
              rel="noreferrer"
              className="pa-qdl"
            >
              <ExternalLink size={14} strokeWidth={2} />
              http://localhost:4000
            </a>
          </Card>
        </aside>
      </div>

      {/* ── FAQ ── */}
      <div className="pa-faq-section">
        <h2 className="font-display text-lg font-semibold text-heading mb-4">
          Frequently asked questions
        </h2>
        <FaqAccordion />
      </div>
    </DashboardLayout>
  )
}
