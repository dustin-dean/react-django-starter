import { api } from '@/lib/api'
import axios from 'axios'

/**
 * User interface matching Django's User model serializer
 */
export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
}

/**
 * Authentication service for session-based authentication.
 * 
 * HOW SESSION AUTHENTICATION WORKS:
 * 
 * 1. LOGIN FLOW:
 *    - Client sends username/password to /api/auth/login/
 *    - Django authenticates and calls login() function
 *    - Django creates session in database
 *    - Django sets sessionid cookie in response (HttpOnly, Secure)
 *    - Browser automatically stores cookie
 *    - Future requests include cookie automatically
 * 
 * 2. SESSION PERSISTENCE:
 *    - Browser stores sessionid cookie (even after page refresh)
 *    - Cookie persists for 7 days (SESSION_COOKIE_AGE)
 *    - Every request includes cookie automatically
 *    - No need for localStorage or manual token management
 * 
 * 3. LOGOUT FLOW:
 *    - Client calls /api/auth/logout/
 *    - Django deletes session from database
 *    - Django tells browser to delete cookie
 *    - User is logged out
 * 
 * 4. CHECKING AUTH STATE:
 *    - Call /api/auth/user/ to get current user
 *    - If session valid: returns user data
 *    - If session invalid: returns 403 error
 *    - Use this on app load to check for existing session
 */

/**
 * Login with username and password.
 * Creates a session and sets sessionid cookie.
 * 
 * @param username - User's username
 * @param password - User's password
 * @returns User object on success
 * @throws Error with message on failure
 */
export async function login(username: string, password: string): Promise<User> {
  try {
    // Call Django login endpoint
    // This will set the sessionid cookie automatically
    const { data } = await api.post<{ user: User }>('/api/auth/login/', {
      username,
      password,
    })
    
    return data.user
  } catch (error) {
    // Handle errors and provide user-friendly messages
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || 'Login failed. Please try again.'
      throw new Error(message)
    }
    throw new Error('An unexpected error occurred during login.')
  }
}

/**
 * Logout current user.
 * Destroys session and clears sessionid cookie.
 * 
 * @throws Error with message on failure
 */
export async function logout(): Promise<void> {
  try {
    // Call Django logout endpoint
    // This will delete the session and clear the cookie
    await api.post('/api/auth/logout/')
  } catch (error) {
    // Even if logout fails on server, we should clear client state
    console.error('Logout error:', error)
    throw new Error('Logout failed. Please try again.')
  }
}

/**
 * Get current authenticated user.
 * Use this to check if user has an active session.
 * 
 * @returns User object if authenticated
 * @throws Error if not authenticated or on failure
 */
export async function getCurrentUser(): Promise<User> {
  try {
    // Call Django user endpoint
    // The sessionid cookie is automatically included
    const { data } = await api.get<{ user: User }>('/api/auth/user/')
    return data.user
  } catch (error) {
    // Session is invalid or expired
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Not authenticated')
      }
      throw new Error('Failed to fetch user data')
    }
    throw new Error('An unexpected error occurred')
  }
}

/**
 * Register a new user using Djoser's registration endpoint.
 * After registration, user must login separately.
 * 
 * @param username - Desired username
 * @param password - Password
 * @param email - Email address
 * @returns User object on success
 * @throws Error with message on failure
 */
export async function register(
  username: string,
  password: string,
  email: string
): Promise<User> {
  try {
    // Call Djoser registration endpoint
    // Note: This does NOT log the user in automatically
    const { data } = await api.post<User>('/auth/users/', {
      username,
      password,
      re_password: password, // Djoser requires password confirmation
      email,
    })
    
    return data
  } catch (error) {
    // Handle validation errors from Djoser
    if (axios.isAxiosError(error)) {
      const errors = error.response?.data
      
      // Format error messages for display
      if (errors) {
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => {
            if (Array.isArray(messages)) {
              return `${field}: ${messages.join(', ')}`
            }
            return `${field}: ${messages}`
          })
          .join('. ')
        
        throw new Error(errorMessages)
      }
      
      throw new Error('Registration failed. Please try again.')
    }
    throw new Error('An unexpected error occurred during registration.')
  }
}
