import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { api } from '@/lib/api'

interface User {
  id: string
  username: string
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Restore auth state on app load
  useEffect(() => {
    const restoreAuthState = async () => {
      const accessToken = localStorage.getItem('access-token')
      const refreshToken = localStorage.getItem('refresh-token')
      
      if (!accessToken || !refreshToken) {
        setIsLoading(false)
        return
      }

      try {
        // Verify the access token
        await api.post('/auth/jwt/verify/', { token: accessToken })
        
        // Token is valid, fetch user data
        const { data } = await api.get('/auth/users/me/')
        setUser(data)
        setIsAuthenticated(true)
      } catch (error) {
        // Token invalid or expired, the interceptor will handle refresh
        // If refresh also fails, tokens will be cleared
        try {
          const { data } = await api.get('/auth/users/me/')
          setUser(data)
          setIsAuthenticated(true)
        } catch (refreshError) {
          // Refresh failed, clear everything
          localStorage.removeItem('access-token')
          localStorage.removeItem('refresh-token')
        }
      } finally {
        setIsLoading(false)
      }
    }

    restoreAuthState()
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
      // Call Djoser's JWT create endpoint
      const { data: tokens } = await api.post('/auth/jwt/create/', {
        username,
        password,
      })
      
      // Store both tokens
      localStorage.setItem('access-token', tokens.access)
      localStorage.setItem('refresh-token', tokens.refresh)

      // Fetch user data
      const { data: userData } = await api.get('/auth/users/me/')
      setUser(userData)
      setIsAuthenticated(true)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail || 'Authentication failed'
        throw new Error(message)
      }
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('access-token')
    localStorage.removeItem('refresh-token')
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