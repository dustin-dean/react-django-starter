import axios from 'axios'

/**
 * Axios instance configured for session-based authentication with Django.
 * 
 * KEY CONCEPTS FOR JUNIOR DEVELOPERS:
 * 
 * 1. Session Authentication vs JWT:
 *    - Session: Django stores session data in database, browser stores sessionid cookie
 *    - JWT: Token stored in localStorage, sent in Authorization header
 *    - This app uses SESSION authentication (more secure for web apps)
 * 
 * 2. HttpOnly Cookies:
 *    - Django sets sessionid cookie with HttpOnly flag
 *    - JavaScript CANNOT access HttpOnly cookies (security feature)
 *    - Browser automatically includes cookie in requests (no manual work needed)
 *    - Protects against XSS attacks (malicious scripts can't steal session)
 * 
 * 3. withCredentials: true:
 *    - Tells browser to include cookies in cross-origin requests
 *    - Required when frontend (localhost:3000) talks to backend (localhost:8000)
 *    - Browser automatically attaches sessionid cookie to every request
 * 
 * 4. CSRF Protection:
 *    - Django requires CSRF token for state-changing requests (POST, PUT, DELETE)
 *    - CSRF cookie is readable by JavaScript (not HttpOnly)
 *    - Token must be sent in X-CSRFToken header
 */

// Your Django backend URL
// In production, this should be your backend domain
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance with session authentication config
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // CRITICAL: Must be true for cookies to work
  // This tells the browser to include cookies (sessionid) in requests
  withCredentials: true,
})

/**
 * Helper function to get CSRF token from cookie.
 * Django sets this cookie automatically when you visit the site.
 * Unlike sessionid cookie (HttpOnly), CSRF cookie is readable by JavaScript.
 */
function getCsrfToken(): string | null {
  // Parse document.cookie to find csrftoken
  const name = 'csrftoken='
  const decodedCookie = decodeURIComponent(document.cookie)
  const cookies = decodedCookie.split(';')
  
  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length)
    }
  }
  return null
}

/**
 * Request interceptor - automatically add CSRF token to requests.
 * 
 * Django requires CSRF token for POST/PUT/DELETE/PATCH requests.
 * The token proves the request came from your frontend, not a malicious site.
 */
api.interceptors.request.use(
  (config) => {
    // Get CSRF token from cookie
    const csrfToken = getCsrfToken()
    
    // Add CSRF token to request headers if present
    // Django checks for X-CSRFToken header
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor - handle authentication errors.
 * 
 * If session expires or is invalid, backend returns 401/403.
 * This interceptor catches those errors and can trigger logout.
 */
api.interceptors.response.use(
  (response) => {
    // Success response - pass through
    return response
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Session is invalid or expired
      // You might want to redirect to login page here
      // Or dispatch a global auth state update
      console.error('Authentication error:', error.response?.data)
      
      // You can dispatch custom events here for the auth context to listen to
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: error.response 
      }))
    }
    
    return Promise.reject(error)
  }
)

export default api