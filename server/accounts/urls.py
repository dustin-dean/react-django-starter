from django.urls import path
from .views import LoginView, LogoutView, CurrentUserView, ProtectedView

# Authentication endpoints for session-based auth
# These work with Django's built-in session framework
urlpatterns = [
    # Session authentication endpoints
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/user/", CurrentUserView.as_view(), name="current-user"),
    
    # Example protected endpoint
    path("protected/", ProtectedView.as_view(), name="protected"),
]
