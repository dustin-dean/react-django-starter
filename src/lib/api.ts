import axios from 'axios'

// Your Django backend URL
const API_BASE_URL = 'http://localhost:8000'

// Event system for auth state changes
const authEventListeners: Array<() => void> = []

export const onAuthError = (callback: () => void) => {
  authEventListeners.push(callback)
  
  // Return cleanup function
  return () => {
    const index = authEventListeners.indexOf(callback)
    if (index > -1) {
      authEventListeners.splice(index, 1)
    }
  }
}

const triggerAuthError = () => {
  authEventListeners.forEach(callback => callback())
}

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - automatically add access token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - automatically refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh-token')
      if (!refreshToken) {
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/jwt/refresh/`, {
          refresh: refreshToken,
        })

        const { access } = response.data
        localStorage.setItem('access-token', access)

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, clear tokens and notify listeners
        localStorage.removeItem('access-token')
        localStorage.removeItem('refresh-token')
        triggerAuthError() // ← Notify React to update state!
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)