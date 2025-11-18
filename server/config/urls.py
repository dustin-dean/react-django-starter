from django.contrib import admin
from django.urls import path, include, re_path
from accounts.auth_views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CookieTokenVerifyView,
    LogoutView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # Djoser auth endpoints (registration, password reset, etc.)
    re_path(r"^auth/", include("djoser.urls")),
    # Custom cookie-based JWT endpoints
    path("auth/jwt/create/", CookieTokenObtainPairView.as_view(), name="jwt-create"),
    path("auth/jwt/refresh/", CookieTokenRefreshView.as_view(), name="jwt-refresh"),
    path("auth/jwt/verify/", CookieTokenVerifyView.as_view(), name="jwt-verify"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    # API endpoints
    path("api/", include("accounts.urls")),
]
