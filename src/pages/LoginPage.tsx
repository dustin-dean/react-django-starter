import React, { useState } from 'react'
import { useAuth } from '@/context/auth'
import { useNavigate } from '@tanstack/react-router'

/**
 * Login page component.
 * 
 * Provides a simple login form with:
 * - Username and password inputs
 * - Error message display
 * - Loading state during authentication
 * - Success redirect to home page
 * 
 * Uses the auth context to access login function.
 */
export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  
  // Form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Handle form submission.
   * Calls login function from auth context.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setError('')
    
    // Validate inputs
    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Call login function from auth context
      // This will:
      // 1. Send credentials to backend
      // 2. Backend creates session and sets cookie
      // 3. Update auth context state
      await login(username, password)
      
      // Login successful - redirect to home page
      navigate({ to: '/' })
    } catch (err) {
      // Login failed - show error message
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    navigate({ to: '/' })
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Session-based authentication example
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
          
          <div className="space-y-4 rounded-md shadow-sm">
            {/* Username input */}
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Username"
                disabled={isLoading}
              />
            </div>
            
            {/* Password input */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Password"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          {/* Info text for developers */}
          <div className="text-xs text-gray-500 mt-4 p-4 bg-blue-50 rounded">
            <strong>For developers:</strong> This login form uses session-based authentication.
            When you click "Sign in", the backend creates a session and sets a HttpOnly cookie.
            The browser automatically includes this cookie in future requests.
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
