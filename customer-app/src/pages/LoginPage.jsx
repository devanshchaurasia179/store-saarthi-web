import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/authService'
import OTPInput from '../components/OTPInput'

const STEP_PHONE = 'phone'
const STEP_OTP = 'otp'
const RESEND_COOLDOWN = 30 // seconds

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login } = useAuth()

  const [step, setStep] = useState(STEP_PHONE)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  // Redirect if already logged in
  const from = location.state?.from || '/checkout'
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  const handleSendOTP = useCallback(async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setError('')
    setLoading(true)

    try {
      await authService.sendOTP(phone)
      setStep(STEP_OTP)
      setResendTimer(RESEND_COOLDOWN)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [phone])

  const handleVerifyOTP = useCallback(async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await authService.verifyOTP(phone, otp)
      const { token, customer } = response.data
      login(customer, token)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }, [phone, otp, login, navigate, from])

  const handleResendOTP = async () => {
    if (resendTimer > 0) return
    setError('')
    setLoading(true)

    try {
      await authService.sendOTP(phone)
      setResendTimer(RESEND_COOLDOWN)
      setOtp('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(value)
    setError('')
  }

  const handleBack = () => {
    if (step === STEP_OTP) {
      setStep(STEP_PHONE)
      setOtp('')
      setError('')
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === STEP_PHONE ? (
            <PhoneStep
              key="phone"
              phone={phone}
              onPhoneChange={handlePhoneChange}
              onSubmit={handleSendOTP}
              loading={loading}
              error={error}
            />
          ) : (
            <OTPStep
              key="otp"
              phone={phone}
              otp={otp}
              onOtpChange={setOtp}
              onSubmit={handleVerifyOTP}
              onResend={handleResendOTP}
              resendTimer={resendTimer}
              loading={loading}
              error={error}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 text-center">
        <p className="text-xs text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

/* ================================
   Phone Step
================================ */
function PhoneStep({ phone, onPhoneChange, onSubmit, loading, error }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onSubmit()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {/* Icon */}
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center"
        >
          <Phone className="w-9 h-9 text-primary" />
        </motion.div>
      </div>

      {/* Text */}
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
          Login to Continue
        </h1>
        <p className="text-sm text-gray-500">
          Enter your phone number to receive a verification code
        </p>
      </div>

      {/* Phone input */}
      <div className="space-y-4">
        <div className="relative">
          <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-4 focus-within:border-primary focus-within:bg-white transition-all">
            <span className="text-sm font-semibold text-gray-500 shrink-0">+91</span>
            <div className="w-px h-6 bg-gray-300" />
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={onPhoneChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter phone number"
              className="flex-1 text-base font-medium text-gray-800 placeholder-gray-400 outline-none bg-transparent tracking-wider"
              maxLength={10}
              autoFocus
              aria-label="Phone number"
            />
          </div>
          {phone.length > 0 && (
            <p className="mt-1.5 text-xs text-gray-400 text-right">
              {phone.length}/10 digits
            </p>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm text-red-500 text-center bg-red-50 px-4 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSubmit}
          disabled={loading || phone.length < 10}
          className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>Send OTP</>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ================================
   OTP Step
================================ */
function OTPStep({ phone, otp, onOtpChange, onSubmit, onResend, resendTimer, loading, error }) {
  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      onSubmit()
    }
  }, [otp, onSubmit])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {/* Icon */}
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center"
        >
          <ShieldCheck className="w-9 h-9 text-green-600" />
        </motion.div>
      </div>

      {/* Text */}
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
          Verify OTP
        </h1>
        <p className="text-sm text-gray-500">
          Enter the 6-digit code sent to{' '}
          <span className="font-semibold text-gray-700">+91 {phone}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="space-y-6">
        <OTPInput
          length={6}
          value={otp}
          onChange={onOtpChange}
          disabled={loading}
        />

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm text-red-500 text-center bg-red-50 px-4 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Resend */}
        <div className="text-center">
          {resendTimer > 0 ? (
            <p className="text-sm text-gray-400">
              Resend OTP in{' '}
              <span className="font-semibold text-gray-600">
                {resendTimer}s
              </span>
            </p>
          ) : (
            <button
              onClick={onResend}
              disabled={loading}
              className="text-sm font-semibold text-primary hover:text-primary-light transition-colors disabled:opacity-50"
            >
              Resend OTP
            </button>
          )}
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSubmit}
          disabled={loading || otp.length < 6}
          className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>Verify & Continue</>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
