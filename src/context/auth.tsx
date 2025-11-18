import React, { createContext, useContext, useState, useEffect } from 'react'
import * as authService from '@/services/auth'
import type { User } from '@/services/auth'

/**
 * Authentication context state and methods.
 * Provides global auth state to the entire application.
 */
interface AuthContextType {
  // Current authenticated user (null if not logged in)
  user: User | null
  
  // Whether user is authenticated (has valid session)
  isAuthenticated: boolean
  
  // Whether we're still checking for existing session on app load
  isLoading: boolean
  
  // Login function - creates session and updates state
  login: (username: string, password: string) => Promise<void>
  
  // Logout function - destroys session and clears state
  logout: () => Promise<void>
}

// Create context with undefined default (will be set by provider)
const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth provider component.
 * 
 * WHAT IT DOES:
 * 1. On app load, checks for existing session by calling getCurrentUser()
 * 2. If session exists, populates user state (user stays logged in)
 * 3. If no session, user remains logged out
 * 4. Provides login/logout functions to children components
 * 5. Shows loading state while checking session
 * 
 * WHY SESSION PERSISTENCE WORKS:
 * - Browser stores sessionid cookie automatically
 * - Cookie persists even after closing/reopening browser (for 7 days)
 * - On app load, cookie is sent with getCurrentUser() request
 * - Django validates cookie and returns user data
 * - User appears logged in without manual intervention
 * 
 * This is different from JWT where you manually store tokens in localStorage.
 * With sessions, the browser handles everything automatically!
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Check for existing session on app load.
   * This runs once when the app first mounts.
   */
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Try to get current user using existing session
        // The sessionid cookie is automatically sent with this request
        const currentUser = await authService.getCurrentUser()
        
        // Session is valid - user is logged in
        setUser(currentUser)
        setIsAuthenticated(true)
      } catch (error) {
        // No valid session - user is logged out
        // This is normal on first visit or after session expires
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        // Done checking - hide loading state
        setIsLoading(false)
      }
    }

    checkSession()
  }, []) // Empty deps array = run once on mount

  /**
   * Login function.
   * Calls backend login endpoint and updates local state.
   */
  const login = async (username: string, password: string) => {
    try {
      // Call login endpoint - this sets sessionid cookie
      const userData = await authService.login(username, password)
      
      // Update local state
      setUser(userData)
      setIsAuthenticated(true)
    } catch (error) {
      // Re-throw error for component to handle
      throw error
    }
  }

  /**
   * Logout function.
   * Calls backend logout endpoint and clears local state.
   */
  const logout = async () => {
    try {
      // Call logout endpoint - this destroys session and clears cookie
      await authService.logout()
    } catch (error) {
      // Log error but still clear local state
      console.error('Logout error:', error)
    } finally {
      // Always clear local state, even if API call fails
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  /**
   * Listen for auth errors from API interceptor.
   * When session expires, API interceptor dispatches 'auth-error' event.
   * We listen for it and automatically log user out.
   */
  useEffect(() => {
    const handleAuthError = () => {
      // Session expired or invalid - clear auth state
      setUser(null)
      setIsAuthenticated(false)
    }

    // Listen for auth error events from axios interceptor
    window.addEventListener('auth-error', handleAuthError)

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('auth-error', handleAuthError)
    }
  }, [])

  /**
   * Show loading screen while checking for existing session.
   * This prevents flash of login screen when user is actually logged in.
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context.
 * Use this in any component that needs auth state or functions.
 * 
 * Example:
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuth()
 *   
 *   if (!isAuthenticated) {
 *     return <LoginForm onLogin={login} />
 *   }
 *   
 *   return <div>Welcome {user?.username}!</div>
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
