import { api } from '@/lib/api'
import axios from 'axios'

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  re_password: string
}

export const authService = {
  // Login with username and password
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const { data } = await api.post<User>('/api/login/', credentials)
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || 'Login failed'
        throw new Error(message)
      }
      throw error
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await api.post('/api/logout/')
    } catch (error) {
      // Even if logout fails on server, we should clear client state
      console.error('Logout error:', error)
    }
  },

  // Register new user
  async register(data: RegisterData): Promise<User> {
    try {
      const { data: user } = await api.post<User>('/auth/users/', data)
      return user
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail || 'Registration failed'
        throw new Error(message)
      }
      throw error
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    try {
      const { data } = await api.get<User>('/api/user/')
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error('Failed to get current user')
      }
      throw error
    }
  },

  // Get CSRF token (useful for initializing the app)
  async getCSRFToken(): Promise<string> {
    try {
      const { data } = await api.get<{ csrfToken: string }>('/api/csrf/')
      return data.csrfToken
    } catch (error) {
      console.error('Failed to get CSRF token:', error)
      throw error
    }
  },
}
