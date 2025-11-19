# Authentication Guide

This guide explains how session-based authentication works in this React + Django application.

## Table of Contents

- [Overview](#overview)
- [How Session Authentication Works](#how-session-authentication-works)
- [Cookie Security](#cookie-security)
- [Development vs Production](#development-vs-production)
- [API Endpoints](#api-endpoints)
- [Frontend Usage](#frontend-usage)
- [Common Issues & Troubleshooting](#common-issues--troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

This application uses **session-based authentication** with Django's built-in session framework. Unlike JWT authentication where tokens are stored in localStorage, session authentication uses **HttpOnly cookies** that the browser manages automatically.

### Why Session Authentication?

- **More Secure**: HttpOnly cookies can't be accessed by JavaScript (XSS protection)
- **Automatic**: Browser handles cookie storage and sending
- **Simple**: No need to manually manage tokens in localStorage
- **Built-in**: Uses Django's battle-tested session framework

## How Session Authentication Works

### Login Flow

```
1. User enters username and password in LoginPage.tsx
2. Frontend calls POST /api/auth/login/ with credentials
3. Django's authenticate() validates credentials
4. Django's login() creates session in database
5. Django sets sessionid cookie in response (HttpOnly, Secure)
6. Browser automatically stores the cookie
7. Frontend receives user data and updates auth context
8. User is logged in!
```

### Session Persistence

```
1. User closes browser and returns later
2. Browser still has sessionid cookie (7 day expiration)
3. App loads and calls GET /api/auth/user/
4. Browser automatically includes sessionid cookie
5. Django validates session from database
6. Django returns user data
7. User appears logged in automatically!
```

### Logout Flow

```
1. User clicks logout
2. Frontend calls POST /api/auth/logout/
3. Django's logout() deletes session from database
4. Django tells browser to delete sessionid cookie
5. Browser deletes the cookie
6. User is logged out
```

### Protected API Requests

```
1. Frontend makes API call (e.g., GET /api/protected/)
2. Browser automatically includes sessionid cookie
3. SessionAuthentication middleware validates session
4. Django populates request.user with User object
5. View checks IsAuthenticated permission
6. Request succeeds with user data
```

## Cookie Security

### HttpOnly Flag

```python
SESSION_COOKIE_HTTPONLY = True  # In settings.py
```

- **What it does**: Prevents JavaScript from reading the cookie
- **Why it matters**: Protects against XSS attacks
- **Important**: You can't access the cookie with `document.cookie` in JavaScript
- **How it works**: Browser still sends cookie, but JavaScript can't read it

### Secure Flag

```python
SESSION_COOKIE_SECURE = not DEBUG  # True in production
```

- **What it does**: Cookie only sent over HTTPS
- **Why it matters**: Prevents cookie theft over unencrypted HTTP
- **Development**: Set to False (allows HTTP on localhost)
- **Production**: Set to True (requires HTTPS)

### SameSite Flag

```python
SESSION_COOKIE_SAMESITE = "Lax"  # In settings.py
```

- **What it does**: Controls when cookie is sent with cross-site requests
- **Options**:
  - `Strict`: Never sent with cross-site requests (most secure, but breaks some flows)
  - `Lax`: Sent with safe cross-site requests (GET, not POST) - **our choice**
  - `None`: Always sent (requires Secure=True)
- **Why Lax**: Balances security and usability for most web apps

## Development vs Production

### Development Settings (DEBUG=True)

```python
# server/config/settings.py
DEBUG = True
SESSION_COOKIE_SECURE = False  # Allow HTTP
SESSION_COOKIE_HTTPONLY = True  # Still protect against XSS
SESSION_COOKIE_SAMESITE = "Lax"

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]
```

**What this means**:
- Can test on `http://localhost` (no HTTPS needed)
- Cookies work between `localhost:8000` (backend) and `localhost:3000` (frontend)
- CORS must be configured to allow credentials

### Production Settings (DEBUG=False)

```python
# server/config/settings.py
DEBUG = False
SESSION_COOKIE_SECURE = True  # Require HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
]

CSRF_TRUSTED_ORIGINS = [
    "https://yourdomain.com",
]
```

**What this means**:
- **HTTPS required** - won't work on plain HTTP
- Must set CSRF_TRUSTED_ORIGINS for your frontend domain
- Cookies are as secure as possible

## API Endpoints

### POST /api/auth/login/

Login and create session.

**Request**:
```json
{
  "username": "john",
  "password": "secretpassword"
}
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Response (400 Bad Request)**:
```json
{
  "error": "Invalid credentials"
}
```

**Side Effect**: Sets `sessionid` cookie in response headers

### POST /api/auth/logout/

Logout and destroy session.

**Requires**: Valid sessionid cookie

**Response (200 OK)**:
```json
{
  "message": "Successfully logged out"
}
```

**Side Effect**: Deletes session from database and clears cookie

### GET /api/auth/user/

Get current authenticated user.

**Requires**: Valid sessionid cookie

**Response (200 OK)**:
```json
{
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Response (403 Forbidden)**: Not authenticated

**Use Case**: Check if user has active session on app load

### POST /auth/users/ (Djoser)

Register new user.

**Request**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securepassword",
  "re_password": "securepassword"
}
```

**Response (201 Created)**:
```json
{
  "id": 2,
  "username": "newuser",
  "email": "newuser@example.com"
}
```

**Note**: Does NOT log user in automatically. Call login endpoint after registration.

## Frontend Usage

### Setup Auth Provider

Wrap your app with `AuthProvider` in `main.tsx`:

```tsx
import { AuthProvider } from '@/context/auth'

const router = createRouter({
  routeTree,
  context: { auth: undefined! },
})

root.render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
)
```

### Use Auth in Components

```tsx
import { useAuth } from '@/context/auth'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <LoginPage />
  }
  
  return (
    <div>
      <h1>Welcome {user?.username}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Protected Routes with TanStack Router

```tsx
// In route file
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/protected')({
  beforeLoad: async ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: ProtectedPage,
})
```

### Make Authenticated API Calls

```tsx
import { api } from '@/lib/api'

async function fetchProtectedData() {
  // sessionid cookie is automatically included
  const { data } = await api.get('/api/protected/')
  return data
}
```

## Common Issues & Troubleshooting

### Issue: "CSRF token missing or incorrect"

**Cause**: CSRF token not sent with POST/PUT/DELETE requests

**Solution**: 
1. Make sure axios interceptor is reading CSRF token from cookie
2. Verify Django set the `csrftoken` cookie (visit any page first)
3. Check that `withCredentials: true` is set in axios config

```typescript
// In api.ts - this should already be configured
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken
  }
  return config
})
```

### Issue: Cookies not being sent with requests

**Cause**: `withCredentials` not set to true

**Solution**:
```typescript
// In api.ts
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // CRITICAL!
})
```

### Issue: CORS errors in browser console

**Cause**: Backend not configured to accept credentials from frontend origin

**Solution**: Check Django settings:
```python
# server/config/settings.py
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Your frontend URL
]
```

### Issue: Session expires immediately

**Cause**: Session cookie settings too restrictive

**Solution**: Check settings:
```python
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 days
SESSION_SAVE_EVERY_REQUEST = False  # Don't update session on every request
```

### Issue: Cannot read sessionid cookie in JavaScript

**This is correct!** HttpOnly cookies are designed to be inaccessible to JavaScript. The browser handles them automatically. You don't need to read the cookie - just make API requests and the browser includes it.

### Issue: Login works in Postman but not in browser

**Cause**: Browser security is stricter than Postman

**Solution**:
1. Check CORS settings (see above)
2. Verify `withCredentials: true` in axios
3. Make sure frontend and backend URLs are correct
4. Check browser console for detailed CORS errors

### Issue: Session lost after page refresh in production

**Cause**: Secure flag requires HTTPS but using HTTP

**Solution**:
1. Set up HTTPS in production
2. Or temporarily set `SESSION_COOKIE_SECURE = False` for testing (NOT RECOMMENDED)

## Security Best Practices

### 1. Always Use HTTPS in Production

```python
# Production settings
SESSION_COOKIE_SECURE = True  # Requires HTTPS
CSRF_COOKIE_SECURE = True
```

Without HTTPS, cookies can be intercepted in transit.

### 2. Keep Session Keys Secret

```bash
# Generate a secure secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Never commit `SECRET_KEY` to git. Use environment variables.

### 3. Set Appropriate Session Expiration

```python
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 days

# Or implement "remember me" functionality:
def login_view(request):
    if request.POST.get('remember_me'):
        request.session.set_expiry(60 * 60 * 24 * 30)  # 30 days
    else:
        request.session.set_expiry(0)  # Browser close
```

### 4. Validate CSRF Tokens

Django does this automatically, but make sure:
```python
# Don't disable CSRF protection!
# DON'T DO: '@csrf_exempt'
```

### 5. Monitor Session Database

Sessions are stored in database. Clean up expired sessions:
```bash
python manage.py clearsessions
```

Run this periodically (e.g., daily cron job) to prevent database bloat.

### 6. Use Strong Password Requirements

```python
# settings.py
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
```

### 7. Implement Rate Limiting

Consider adding rate limiting to login endpoint to prevent brute force attacks:

```python
# Using django-ratelimit
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/m', method='POST')
def login_view(request):
    # ... login logic
```

### 8. Log Authentication Events

```python
import logging

logger = logging.getLogger(__name__)

def login_view(request):
    # ... after successful login
    logger.info(f"User {user.username} logged in from {request.META.get('REMOTE_ADDR')}")
```

### 9. Implement Logout Everywhere

For sensitive applications, allow users to invalidate all sessions:

```python
def logout_all_sessions(user):
    # Delete all sessions for this user
    Session.objects.filter(
        session_key__in=[
            s.session_key for s in Session.objects.all()
            if s.get_decoded().get('_auth_user_id') == str(user.id)
        ]
    ).delete()
```

### 10. Consider Two-Factor Authentication

For additional security, implement 2FA using packages like `django-otp` or `django-allauth`.

## Code Examples for Junior Developers

### Example: Login Form with Error Handling

```tsx
function LoginForm() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(username, password)
      // Success - auth context updates automatically
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  )
}
```

### Example: Conditional Rendering Based on Auth

```tsx
function App() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.username}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  )
}
```

### Example: Fetching Protected Data

```tsx
function ProtectedComponent() {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // sessionid cookie automatically included
        const response = await api.get('/api/protected/')
        setData(response.data)
      } catch (error) {
        console.error('Failed to fetch:', error)
      }
    }
    fetchData()
  }, [])

  return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>
}
```

## Additional Resources

- [Django Session Documentation](https://docs.djangoproject.com/en/stable/topics/http/sessions/)
- [Django REST Framework Authentication](https://www.django-rest-framework.org/api-guide/authentication/)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
