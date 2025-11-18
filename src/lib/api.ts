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

// Helper to get CSRF token from cookie
const getCsrfToken = (): string | null => {
  const name = 'csrftoken'
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    const trimmed = cookie.trim()
    if (trimmed.startsWith(name + '=')) {
      return trimmed.substring(name.length + 1)
    }
  }
  return null
}

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies with requests
})

// Request interceptor - add CSRF token to requests
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCsrfToken()
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      config.headers['X-CSRFToken'] = csrfToken
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the token using the refresh cookie
        await api.post('/auth/jwt/refresh/')
        
        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, notify listeners to update auth state
        triggerAuthError()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)