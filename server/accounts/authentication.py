from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication class that reads the access token from cookies
    instead of the Authorization header.
    """
    
    def authenticate(self, request):
        # First try to get token from cookie
        raw_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE'])
        
        if raw_token is None:
            # Fallback to header-based authentication for compatibility
            return super().authenticate(request)
        
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
