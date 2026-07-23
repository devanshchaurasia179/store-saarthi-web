import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    try {
      const auth = JSON.parse(localStorage.getItem('store_saarthi_auth') || '{}')
      if (auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`
      }
    } catch (e) {
      // ignore
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('store_saarthi_auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
