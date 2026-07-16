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
      <div className="auth-visual" aria-hidden>
        <div className="auth-visual__glow" />
        <p className="auth-visual__brand">StoreSaarthi</p>
        <p className="auth-visual__tag">Your shop, guided every day</p>
      </div>

      <div className="auth-panel">
        <header className="auth-panel__header">
          <p className="auth-panel__brand">StoreSaarthi</p>
          <h1>Sign in</h1>
          <p className="auth-panel__sub">
            {mode === 'otp'
              ? 'We’ll email a one-time password for this mobile number.'
              : 'Use your device secret key to sign in on another device.'}
          </p>
        </header>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'otp'}
            className={mode === 'otp' ? 'is-active' : undefined}
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
            className={mode === 'secret' ? 'is-active' : undefined}
            onClick={() => {
              setMode('secret')
              setError('')
              setInfo('')
            }}
          >
            Secret key
          </button>
        </div>

        {mode === 'otp' && step === 'mobile' && (
          <form className="auth-form" onSubmit={handleSendOtp}>
            <label>
              Mobile number
              <input
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit number"
                value={mobile}
                onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                disabled={busy}
              />
            </label>
            <button type="submit" className="auth-btn" disabled={busy}>
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}

        {mode === 'otp' && step === 'otp' && (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <p className="auth-hint">
              OTP sent for <strong>+91 {normalizeMobile(mobile)}</strong>
            </p>
            <label>
              Enter OTP
              <input
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
            <button type="submit" className="auth-btn" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & continue'}
            </button>
            <div className="auth-row">
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setStep('mobile')
                  setOtp('')
                  setError('')
                }}
              >
                Change number
              </button>
              <button
                type="button"
                className="auth-link"
                disabled={resendIn > 0 || busy}
                onClick={() => void handleResend()}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {mode === 'secret' && (
          <form className="auth-form" onSubmit={handleSecretLogin}>
            <label>
              Mobile number
              <input
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit number"
                value={mobile}
                onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                disabled={busy}
              />
            </label>
            <label>
              Secret key
              <input
                autoComplete="off"
                placeholder="SS-XXXXXXXX"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
                disabled={busy}
              />
            </label>
            <button type="submit" className="auth-btn" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {info && <p className="auth-msg auth-msg--info">{info}</p>}
        {error && <p className="auth-msg auth-msg--error">{error}</p>}
      </div>
    </div>
  )
}
