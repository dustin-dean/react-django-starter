import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { api, onAuthError } from '@/lib/api'

interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Restore auth state on app load
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        // Try to verify the access token from cookie
        await api.post('/auth/jwt/verify/')
        
        // Token is valid, fetch user data
        const { data } = await api.get('/auth/users/me/')
        setUser(data)
        setIsAuthenticated(true)
      } catch (error) {
        // Token invalid or expired, try to refresh
        try {
          await api.post('/auth/jwt/refresh/')
          // Refresh successful, fetch user data
          const { data } = await api.get('/auth/users/me/')
          setUser(data)
          setIsAuthenticated(true)
        } catch (refreshError) {
          // Both verify and refresh failed, user is not authenticated
          setUser(null)
          setIsAuthenticated(false)
        }
      } finally {
        setIsLoading(false)
      }
    }

    restoreAuthState()
  }, [])

  // Listen for auth errors (e.g., token refresh failures)
  useEffect(() => {
    const cleanup = onAuthError(() => {
      setUser(null)
      setIsAuthenticated(false)
    })
    return cleanup
  }, [])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const login = async (username: string, password: string) => {
    try {
      // Call our custom cookie-based JWT create endpoint
      const { data } = await api.post('/auth/jwt/create/', {
        username,
        password,
      })
      
      // The backend sets cookies automatically
      // Extract user data from response
      if (data.user) {
        setUser(data.user)
        setIsAuthenticated(true)
      } else {
        // Fallback: fetch user data if not in response
        const { data: userData } = await api.get('/auth/users/me/')
        setUser(userData)
        setIsAuthenticated(true)
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail || 'Authentication failed'
        throw new Error(message)
      }
      throw error
    }
  }

  const logout = async () => {
    try {
      // Call backend logout endpoint to blacklist token
      await api.post('/auth/logout/')
    } catch (error) {
      // Continue with logout even if backend call fails
      console.error('Logout error:', error)
    } finally {
      // Clear local state
      setUser(null)
      setIsAuthenticated(false)
      
      // Cookies are cleared by the backend response
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}