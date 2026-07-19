import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

type Mode = 'otp' | 'secret'
type Step = 'mobile' | 'otp'

function normalizeMobile(value: string) {
  return value.replace(/\D/g, '').slice(0, 10)
}

export function LoginPage() {
  const { requestOtp, confirmOtp, loginSecret } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('otp')
  const [step, setStep] = useState<Step>('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [resendIn])

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    const mobileNumber = normalizeMobile(mobile)
    if (mobileNumber.length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }

    setBusy(true)
    try {
      await requestOtp(mobileNumber)
      setStep('otp')
      setResendIn(30)
      setInfo('OTP sent to your registered email inbox. Valid for 5 minutes.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send OTP')
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    setError('')

    const mobileNumber = normalizeMobile(mobile)
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP')
      return
    }

    setBusy(true)
    try {
      const shop = await confirmOtp(mobileNumber, otp.trim())
      navigate(shop.isOnboarded ? '/' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'OTP verification failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSecretLogin(e: FormEvent) {
    e.preventDefault()
    setError('')

    const mobileNumber = normalizeMobile(mobile)
    if (mobileNumber.length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    if (!secretKey.trim()) {
      setError('Enter your secret key')
      return
    }

    setBusy(true)
    try {
      const shop = await loginSecret(mobileNumber, secretKey.trim())
      navigate(shop.isOnboarded ? '/' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Secret key login failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0 || busy) return
    setError('')
    setBusy(true)
    try {
      await requestOtp(normalizeMobile(mobile))
      setResendIn(30)
      setInfo('A new OTP was sent to email.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend OTP')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      {/* Left form panel */}
      <div className="auth-panel">
        {/* Static decorative background elements */}
        <div className="auth-bg-decor" aria-hidden="true">
          {/* Pie chart — top left corner */}
          <svg className="auth-bg-decor__pie auth-bg-decor__pie--1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="rgba(74, 108, 247, 0.06)" />
            <path d="M50 50 L50 10 A40 40 0 0 1 84.6 30Z" fill="rgba(74, 108, 247, 0.14)" />
            <path d="M50 50 L84.6 30 A40 40 0 0 1 90 50Z" fill="rgba(74, 108, 247, 0.10)" />
            <path d="M50 50 L90 50 A40 40 0 0 1 70 84.6Z" fill="rgba(74, 108, 247, 0.18)" />
            <path d="M50 50 L70 84.6 A40 40 0 0 1 30 84.6Z" fill="rgba(74, 108, 247, 0.08)" />
            <path d="M50 50 L30 84.6 A40 40 0 0 1 10 50Z" fill="rgba(74, 108, 247, 0.12)" />
            <path d="M50 50 L10 50 A40 40 0 0 1 50 10Z" fill="rgba(74, 108, 247, 0.06)" />
          </svg>

          {/* Smaller pie chart — bottom center */}
          <svg className="auth-bg-decor__pie auth-bg-decor__pie--2" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="35" fill="rgba(74, 108, 247, 0.04)" />
            <path d="M50 50 L50 15 A35 35 0 0 1 80 32Z" fill="rgba(74, 108, 247, 0.12)" />
            <path d="M50 50 L80 32 A35 35 0 0 1 85 55Z" fill="rgba(74, 108, 247, 0.08)" />
            <path d="M50 50 L85 55 A35 35 0 0 1 50 85Z" fill="rgba(74, 108, 247, 0.15)" />
            <path d="M50 50 L50 85 A35 35 0 0 1 15 55Z" fill="rgba(74, 108, 247, 0.06)" />
            <path d="M50 50 L15 55 A35 35 0 0 1 50 15Z" fill="rgba(74, 108, 247, 0.10)" />
          </svg>

          {/* Bar chart — bottom left */}
          <svg className="auth-bg-decor__bars auth-bg-decor__bars--1" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="50" width="14" height="25" rx="3" fill="rgba(74, 108, 247, 0.10)" />
            <rect x="30" y="35" width="14" height="40" rx="3" fill="rgba(74, 108, 247, 0.15)" />
            <rect x="50" y="20" width="14" height="55" rx="3" fill="rgba(74, 108, 247, 0.12)" />
            <rect x="70" y="30" width="14" height="45" rx="3" fill="rgba(74, 108, 247, 0.18)" />
            <rect x="90" y="10" width="14" height="65" rx="3" fill="rgba(74, 108, 247, 0.08)" />
          </svg>

          {/* Donut chart — top right of left panel */}
          <svg className="auth-bg-decor__donut auth-bg-decor__donut--1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(74, 108, 247, 0.06)" strokeWidth="12" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(74, 108, 247, 0.14)" strokeWidth="12" strokeDasharray="66 154" strokeDashoffset="0" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(74, 108, 247, 0.10)" strokeWidth="12" strokeDasharray="44 176" strokeDashoffset="-66" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(74, 108, 247, 0.18)" strokeWidth="12" strokeDasharray="55 165" strokeDashoffset="-110" />
          </svg>

          {/* Line chart — mid left */}
          <svg className="auth-bg-decor__line auth-bg-decor__line--1" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
            <polyline points="10,45 30,35 50,40 70,20 90,25 110,10 130,15" fill="none" stroke="rgba(74, 108, 247, 0.12)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="10,50 30,48 50,52 70,38 90,42 110,30 130,35" fill="none" stroke="rgba(74, 108, 247, 0.07)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Scattered small elements */}
          <div className="auth-bg-decor__circle auth-bg-decor__circle--1" />
          <div className="auth-bg-decor__circle auth-bg-decor__circle--2" />
          <div className="auth-bg-decor__circle auth-bg-decor__circle--3" />
          <div className="auth-bg-decor__dots auth-bg-decor__dots--1">
            <span /><span /><span /><span />
          </div>
          <div className="auth-bg-decor__pill auth-bg-decor__pill--1" />
          <div className="auth-bg-decor__pill auth-bg-decor__pill--2" />
        </div>
        <div className="auth-panel__inner">
          {/* Brand mark */}
          <div className="auth-panel__brand-mark">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>StoreSaarthi</span>
          </div>

          <header className="auth-panel__header">
            <h1 className="auth-panel__title">Login</h1>
            <p className="auth-panel__sub">
              {mode === 'otp'
                ? "Welcome! Sign in to your store management system."
                : 'Use your device secret key to sign in.'}
            </p>
          </header>

          {/* Mode tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'otp'}
              className={`auth-tabs__btn ${mode === 'otp' ? 'auth-tabs__btn--active' : ''}`}
              onClick={() => {
                setMode('otp')
                setStep('mobile')
                setError('')
                setInfo('')
              }}
            >
              Email OTP
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'secret'}
              className={`auth-tabs__btn ${mode === 'secret' ? 'auth-tabs__btn--active' : ''}`}
              onClick={() => {
                setMode('secret')
                setError('')
                setInfo('')
              }}
            >
              Secret Key
            </button>
          </div>

          {/* OTP flow — step 1: mobile */}
          {mode === 'otp' && step === 'mobile' && (
            <form className="auth-form" onSubmit={handleSendOtp}>
              <label className="auth-form__label">
                <span className="auth-form__label-text">Mobile number</span>
                <div className="auth-form__input-wrap">
                  <span className="auth-form__input-prefix">+91</span>
                  <input
                    className="auth-form__input auth-form__input--prefixed"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                    disabled={busy}
                  />
                </div>
              </label>
              <button type="submit" className="auth-form__submit" disabled={busy}>
                {busy ? (
                  <>
                    <span className="auth-form__spinner" />
                    Sending…
                  </>
                ) : 'Send OTP'}
              </button>
            </form>
          )}

          {/* OTP flow — step 2: verify */}
          {mode === 'otp' && step === 'otp' && (
            <form className="auth-form" onSubmit={handleVerifyOtp}>
              <div className="auth-form__sent-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
                </svg>
                OTP sent for <strong>+91 {normalizeMobile(mobile)}</strong>
              </div>
              <label className="auth-form__label">
                <span className="auth-form__label-text">Enter OTP</span>
                <input
                  className="auth-form__input auth-form__input--otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={busy}
                  autoFocus
                />
              </label>
              <button type="submit" className="auth-form__submit" disabled={busy}>
                {busy ? (
                  <>
                    <span className="auth-form__spinner" />
                    Verifying…
                  </>
                ) : 'Verify & Continue'}
              </button>
              <div className="auth-form__actions">
                <button
                  type="button"
                  className="auth-form__link"
                  onClick={() => { setStep('mobile'); setOtp(''); setError('') }}
                >
                  ← Change number
                </button>
                <button
                  type="button"
                  className="auth-form__link"
                  disabled={resendIn > 0 || busy}
                  onClick={() => void handleResend()}
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Secret key flow */}
          {mode === 'secret' && (
            <form className="auth-form" onSubmit={handleSecretLogin}>
              <label className="auth-form__label">
                <span className="auth-form__label-text">Mobile number</span>
                <div className="auth-form__input-wrap">
                  <span className="auth-form__input-prefix">+91</span>
                  <input
                    className="auth-form__input auth-form__input--prefixed"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                    disabled={busy}
                  />
                </div>
              </label>
              <label className="auth-form__label">
                <span className="auth-form__label-text">Secret key</span>
                <div className="auth-form__input-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-form__input-icon">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                  <input
                    className="auth-form__input auth-form__input--icon"
                    autoComplete="off"
                    placeholder="SS-XXXXXXXX"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
                    disabled={busy}
                  />
                </div>
              </label>
              <button type="submit" className="auth-form__submit" disabled={busy}>
                {busy ? (
                  <>
                    <span className="auth-form__spinner" />
                    Signing in…
                  </>
                ) : 'Sign In'}
              </button>
            </form>
          )}

          {/* Messages */}
          {info && (
            <div className="auth-msg auth-msg--info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {info}
            </div>
          )}
          {error && (
            <div className="auth-msg auth-msg--error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Right illustration panel */}
      <div className="auth-visual" aria-hidden>
        <img
          src="/authpage.png"
          alt=""
          className="auth-visual__img"
        />
      </div>
    </div>
  )
}
