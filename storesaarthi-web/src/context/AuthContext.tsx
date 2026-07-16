import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  completeOnboarding,
  fetchMe,
  loginWithSecret,
  logoutRequest,
  sendOtp,
  verifyOtp,
} from '../api/auth'
import { ApiError, getStoredToken, setStoredToken } from '../api/client'
import type { OnboardingPayload, Shop } from '../types/auth'

type AuthContextValue = {
  shop: Shop | null
  token: string | null
  loading: boolean
  secretKeyOnce: string | null
  clearSecretKeyOnce: () => void
  requestOtp: (mobileNumber: string) => Promise<void>
  confirmOtp: (mobileNumber: string, otp: string) => Promise<Shop>
  loginSecret: (mobileNumber: string, secretKey: string) => Promise<Shop>
  logout: () => Promise<void>
  saveOnboarding: (payload: OnboardingPayload) => Promise<Shop>
  refreshShop: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<Shop | null>(null)
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [loading, setLoading] = useState(true)
  const [secretKeyOnce, setSecretKeyOnce] = useState<string | null>(null)

  const applySession = useCallback((nextToken: string, nextShop: Shop, rawSecret?: string | null) => {
    setStoredToken(nextToken)
    setToken(nextToken)
    setShop(nextShop)
    if (rawSecret) setSecretKeyOnce(rawSecret)
  }, [])

  const refreshShop = useCallback(async () => {
    const stored = getStoredToken()
    if (!stored) {
      setShop(null)
      setToken(null)
      return
    }

    const { shop: me } = await fetchMe()
    setShop(me)
    setToken(stored)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const stored = getStoredToken()
      if (!stored) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const { shop: me } = await fetchMe()
        if (!cancelled) {
          setShop(me)
          setToken(stored)
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
          setStoredToken(null)
          if (!cancelled) {
            setShop(null)
            setToken(null)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const requestOtp = useCallback(async (mobileNumber: string) => {
    await sendOtp(mobileNumber)
  }, [])

  const confirmOtp = useCallback(
    async (mobileNumber: string, otp: string) => {
      const res = await verifyOtp(mobileNumber, otp)
      applySession(res.token, res.shop, res.secretKey)
      return res.shop
    },
    [applySession],
  )

  const loginSecret = useCallback(
    async (mobileNumber: string, secretKey: string) => {
      const res = await loginWithSecret(mobileNumber, secretKey)
      applySession(res.token, res.shop)
      return res.shop
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // clear local session even if network fails
    } finally {
      setStoredToken(null)
      setToken(null)
      setShop(null)
      setSecretKeyOnce(null)
    }
  }, [])

  const saveOnboarding = useCallback(async (payload: OnboardingPayload) => {
    const { shop: updated } = await completeOnboarding(payload)
    setShop(updated)
    return updated
  }, [])

  const clearSecretKeyOnce = useCallback(() => setSecretKeyOnce(null), [])

  const value: AuthContextValue = {
    shop,
    token,
    loading,
    secretKeyOnce,
    clearSecretKeyOnce,
    requestOtp,
    confirmOtp,
    loginSecret,
    logout,
    saveOnboarding,
    refreshShop,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
