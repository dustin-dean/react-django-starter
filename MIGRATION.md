# Migration Guide: localStorage to Cookie-based Authentication

This guide helps you migrate from the old localStorage-based JWT authentication to the new cookie-based system.

## What Changed?

### Before (localStorage-based)
- JWT tokens stored in `localStorage` as `access-token` and `refresh-token`
- Manual token management in code
- Tokens accessible by JavaScript (vulnerable to XSS)
- Manual Authorization header management

### After (Cookie-based)
- JWT tokens stored in HttpOnly cookies (not accessible by JavaScript)
- Automatic cookie handling by browser
- CSRF protection enabled
- More secure in production (Secure, SameSite attributes)
- Token blacklisting on logout

## Breaking Changes

### Backend Changes

1. **New Authentication Endpoints**
   - Old: `/auth/jwt/create/` returned `{"access": "...", "refresh": "..."}`
   - New: `/auth/jwt/create/` returns `{"detail": "Login successful", "user": {...}}` and sets cookies

2. **New Logout Endpoint**
   - Added: `POST /auth/logout/` - blacklists tokens and clears cookies
   - Required for proper logout functionality

3. **Authentication Method**
   - Old: Read token from `Authorization: Bearer <token>` header
   - New: Read token from `access_token` cookie (still supports header for backward compatibility)

### Frontend Changes

1. **Login Response**
   - Old: Extract `access` and `refresh` from response.data
   - New: Extract `user` from response.data, cookies are set automatically

2. **Token Storage**
   - Old: `localStorage.setItem('access-token', token)`
   - New: No manual storage needed, cookies are set by the server

3. **Logout**
   - Old: `localStorage.removeItem('access-token')` and `localStorage.removeItem('refresh-token')`
   - New: Call `POST /auth/logout/` endpoint to blacklist and clear cookies

4. **API Configuration**
   - Old: Manual Authorization header in interceptor
   - New: `withCredentials: true` for automatic cookie handling + CSRF token

## Migration Steps

### If You're Currently Using the Old System

1. **Update your frontend code** to use the new `auth.tsx` and `api.ts` files
2. **Clear existing localStorage tokens** on first load:
   ```javascript
   // Add this to your app initialization
   localStorage.removeItem('access-token')
   localStorage.removeItem('refresh-token')
   ```
3. **Update your Django settings** to include the new JWT cookie configuration
4. **Run migrations** for token blacklist: `python manage.py migrate`
5. **Test thoroughly** in development before deploying to production

### For New Users

Simply use the current implementation - no migration needed!

## Environment Variables

Make sure your `.env` file includes:

```env
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

In production, use HTTPS:

```env
DEBUG=False
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

## Common Issues During Migration

### Issue: "CSRF token missing or incorrect"
**Solution**: Ensure `CSRF_TRUSTED_ORIGINS` includes your frontend URL

### Issue: Cookies not being set
**Solution**: 
- Check that `withCredentials: true` is set in axios config
- Verify CORS configuration includes your frontend origin
- Check browser console for CORS errors

### Issue: Authentication not persisting
**Solution**:
- Verify cookies are being set (check browser DevTools → Application → Cookies)
- Ensure backend and frontend URLs match CORS/CSRF configurations
- In development, use `http://localhost:3000` consistently (not mixing localhost and 127.0.0.1)

## Testing After Migration

1. **Login** - Check that cookies are set in browser DevTools
2. **Access protected endpoint** - Verify authentication works
3. **Refresh page** - Ensure authentication persists
4. **Logout** - Verify cookies are cleared and you can't access protected endpoints
5. **Login again** - Ensure old blacklisted tokens don't work

## Rollback Plan

If you need to rollback to localStorage-based authentication:

1. Revert to commit `24927ca` (before this PR)
2. Clear user sessions/cookies
3. Update frontend to use old authentication flow

However, we strongly recommend keeping the cookie-based system for security reasons.

## Security Benefits

The migration provides these security improvements:

1. **XSS Protection**: Tokens in HttpOnly cookies can't be accessed by malicious scripts
2. **CSRF Protection**: Built-in protection with CSRF tokens
3. **Secure Transport**: In production, cookies are only sent over HTTPS
4. **Token Blacklisting**: Proper logout implementation that prevents token reuse
5. **Reduced Token Lifetime**: 15-minute access tokens limit exposure window

## Questions?

See [AUTHENTICATION.md](./AUTHENTICATION.md) for complete documentation on the new system.
