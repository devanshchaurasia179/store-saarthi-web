import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const AUTH_STORAGE_KEY = 'store_saarthi_auth'

function getInitialAuth() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    // ignore
  }
  return { user: null, token: null, isAuthenticated: false }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getInitialAuth)

  const login = useCallback((user, token) => {
    const authState = { user, token, isAuthenticated: true }
    setAuth(authState)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState))
  }, [])

  const logout = useCallback(() => {
    const authState = { user: null, token: null, isAuthenticated: false }
    setAuth(authState)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const updateUser = useCallback((userOrUpdater) => {
    setAuth((prev) => {
      const newUser =
        typeof userOrUpdater === 'function'
          ? userOrUpdater(prev.user)
          : userOrUpdater
      const updated = { ...prev, user: newUser }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
