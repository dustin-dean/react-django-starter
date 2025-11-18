from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "False") == "True"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework.authtoken",
    "djoser",
    "corsheaders",
    # Local
    "accounts.apps.AccountsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # CORS - must be high up
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

AUTH_USER_MODEL = "accounts.User"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =============================================================================
# SESSION CONFIGURATION
# =============================================================================
# Session-based authentication uses Django's built-in session framework.
# Sessions are stored in the database (single-server deployment).
# The sessionid cookie is set by Django's login() function automatically.

SESSION_ENGINE = "django.contrib.sessions.backends.db"  # Store sessions in database

# Session cookie settings for security
# These control how the browser handles the sessionid cookie
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 days in seconds
SESSION_COOKIE_HTTPONLY = True  # Prevents JavaScript access (XSS protection)
SESSION_COOKIE_SAMESITE = "Lax"  # CSRF protection (allows GET from other sites)

# Environment-aware secure cookie setting
# In production (DEBUG=False), require HTTPS for session cookies
# In development (DEBUG=True), allow HTTP for local testing
SESSION_COOKIE_SECURE = not DEBUG  # Only send cookie over HTTPS in production

# Session persistence settings
SESSION_SAVE_EVERY_REQUEST = False  # Don't update session on every request
SESSION_COOKIE_NAME = "sessionid"  # Standard Django session cookie name

# =============================================================================
# CSRF CONFIGURATION  
# =============================================================================
# CSRF protection works with session authentication
# Frontend must include CSRF token from cookie in requests

CSRF_COOKIE_HTTPONLY = False  # JavaScript needs to read this for CSRF token
CSRF_COOKIE_SAMESITE = "Lax"  # Same as session cookie
CSRF_COOKIE_SECURE = not DEBUG  # Match session cookie security

# For production deployments, configure trusted origins for CSRF
# This should match your frontend domain(s)
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if os.getenv("CSRF_TRUSTED_ORIGINS") else []

# =============================================================================
# CORS SETTINGS
# =============================================================================
# CORS must be configured to allow credentials (cookies) from frontend
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
CORS_ALLOW_CREDENTIALS = True  # Required for session cookies to work

# =============================================================================
# REST FRAMEWORK SETTINGS
# =============================================================================
# Configure DRF to use both session and JWT authentication
# Session auth is primary for web clients, JWT kept for compatibility
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework.authentication.SessionAuthentication",  # Primary: session-based
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # Secondary: JWT for API clients
    ),
    # Default permission is authenticated users only
    # Individual views can override this as needed
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}

# =============================================================================
# JWT SETTINGS (Optional - kept for API clients)
# =============================================================================
# JWT authentication is optional and kept for non-browser API clients
# Browser clients should use session authentication instead
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# =============================================================================
# DJOSER SETTINGS (User Registration)
# =============================================================================
# Djoser provides user registration endpoints
# Authentication endpoints are custom (see accounts.views)
DJOSER = {
    "USER_CREATE_PASSWORD_RETYPE": True,
    "SEND_ACTIVATION_EMAIL": False,
    "PASSWORD_RESET_CONFIRM_URL": "password-reset/{uid}/{token}",
    "USERNAME_RESET_CONFIRM_URL": "username-reset/{uid}/{token}",
    "ACTIVATION_URL": "activate/{uid}/{token}",
    "SERIALIZERS": {
        "user_create": "accounts.serializers.UserCreateSerializer",
        "user": "accounts.serializers.UserSerializer",
        "current_user": "accounts.serializers.UserSerializer",
    },
}
