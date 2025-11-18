# Authentication System

This application uses a **cookie-based JWT authentication** system for enhanced security.

## Overview

The authentication system stores JWT tokens in HttpOnly cookies instead of localStorage, providing better protection against XSS attacks. The implementation includes:

- **HttpOnly Cookies**: Tokens are stored in cookies that cannot be accessed by JavaScript
- **CSRF Protection**: Cross-Site Request Forgery protection is enabled
- **Secure Cookies**: In production, cookies are only transmitted over HTTPS
- **Token Rotation**: Refresh tokens are rotated on each use
- **Token Blacklisting**: Logout properly blacklists refresh tokens
- **Short-lived Access Tokens**: Access tokens expire after 15 minutes

## How It Works

### Login Flow

1. User submits credentials to `/auth/jwt/create/`
2. Backend validates credentials and generates JWT tokens
3. Backend sets tokens in HttpOnly cookies in the response
4. Frontend receives user data in the response body
5. Frontend updates authentication state

### Authentication Flow

1. Browser automatically includes cookies with each request
2. Backend reads access token from the `access_token` cookie
3. Backend validates the token and authenticates the request
4. If token is expired, frontend automatically calls `/auth/jwt/refresh/`
5. Backend rotates tokens and sets new cookies

### Logout Flow

1. Frontend calls `/auth/logout/`
2. Backend blacklists the refresh token
3. Backend clears cookies by setting them to expire
4. Frontend clears local authentication state

## API Endpoints

### Login
```bash
POST /auth/jwt/create/
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}

Response: 200 OK
{
  "detail": "Login successful",
  "user": {
    "id": 1,
    "username": "your-username",
    "email": "your@email.com",
    "first_name": "First",
    "last_name": "Last"
  }
}

Cookies Set:
- access_token (HttpOnly, expires in 15 min)
- refresh_token (HttpOnly, expires in 7 days)
```

### Logout
```bash
POST /auth/logout/
(requires authentication)

Response: 200 OK
{
  "detail": "Logout successful"
}

Cookies Cleared:
- access_token
- refresh_token
```

### Token Refresh
```bash
POST /auth/jwt/refresh/
(automatically called by frontend when access token expires)

Response: 200 OK
{
  "detail": "Token refreshed successfully"
}

Cookies Updated:
- access_token (new token, expires in 15 min)
- refresh_token (rotated token, expires in 7 days)
```

### Token Verify
```bash
POST /auth/jwt/verify/

Response: 200 OK
{
  "detail": "Token is valid"
}
```

### Get Current User
```bash
GET /auth/users/me/
(requires authentication)

Response: 200 OK
{
  "id": 1,
  "username": "your-username",
  "email": "your@email.com",
  "first_name": "First",
  "last_name": "Last"
}
```

## Frontend Usage

### Using the Auth Context

```tsx
import { useAuth } from '@/auth'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  const handleLogin = async () => {
    try {
      await login('username', 'password')
      // User is now authenticated
    } catch (error) {
      console.error('Login failed:', error.message)
    }
  }
  
  const handleLogout = async () => {
    await logout()
    // User is now logged out
  }
  
  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.username}!</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  )
}
```

### Making Authenticated API Calls

```tsx
import { api } from '@/lib/api'

// The axios instance automatically includes cookies
async function fetchProtectedData() {
  try {
    const { data } = await api.get('/api/protected/')
    return data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  }
}
```

## Configuration

### Development

For local development, the default `.env` settings work out of the box:

```env
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3000,http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3000,http://localhost:3000
```

### Production

For production deployment, update your `.env` file:

```env
SECRET_KEY=<generate-a-strong-secret-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

With `DEBUG=False`, the following security settings are automatically enabled:
- `CSRF_COOKIE_SECURE = True` (HTTPS only)
- `SESSION_COOKIE_SECURE = True` (HTTPS only)
- `AUTH_COOKIE_SECURE = True` (HTTPS only)
- `AUTH_COOKIE_SAMESITE = "Strict"` (strong CSRF protection)

## Security Features

### HttpOnly Cookies
Tokens are stored in HttpOnly cookies, which prevents JavaScript from accessing them. This protects against XSS attacks where malicious scripts could steal authentication tokens.

### CSRF Protection
The application includes CSRF protection for all state-changing requests (POST, PUT, PATCH, DELETE). The frontend automatically includes the CSRF token from cookies in request headers.

### Secure Cookies
In production (DEBUG=False), all authentication cookies are marked as Secure, meaning they will only be transmitted over HTTPS connections.

### SameSite Attribute
Cookies include the SameSite attribute:
- **Development (DEBUG=True)**: SameSite=Lax (allows cookies for top-level navigation)
- **Production (DEBUG=False)**: SameSite=Strict (only allows cookies for same-site requests)

### Token Blacklisting
When a user logs out, their refresh token is blacklisted in the database, preventing it from being used to generate new access tokens.

### Short Token Lifetime
Access tokens expire after 15 minutes, limiting the window of opportunity if a token is compromised. Refresh tokens are automatically used to obtain new access tokens.

### Token Rotation
Refresh tokens are rotated on each use, meaning a new refresh token is issued every time it's used to obtain a new access token. This limits the lifetime of any single refresh token.

## Troubleshooting

### Cookies Not Being Set
- Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Ensure `CSRF_TRUSTED_ORIGINS` includes your frontend URL
- Check that the frontend is using `withCredentials: true` in axios config

### 403 CSRF Error
- Ensure the frontend is sending the CSRF token in the `X-CSRFToken` header
- Check that the CSRF cookie is accessible (not HttpOnly)
- Verify that `CSRF_TRUSTED_ORIGINS` includes your frontend URL

### Authentication Not Persisting
- Check browser console for CORS errors
- Verify cookies are being set in the browser (check Application/Storage in DevTools)
- Ensure the backend and frontend are on the same domain or CORS is properly configured

### Token Refresh Failing
- Check that the refresh token cookie is being sent with requests
- Verify the token hasn't been blacklisted (check `token_blacklist_blacklistedtoken` table)
- Ensure the token hasn't expired (7 days default lifetime)
