from django.urls import path
from .views import ProtectedView, LoginView, LogoutView, UserDetailView, CSRFTokenView

urlpatterns = [
    path("protected/", ProtectedView.as_view(), name="protected"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("user/", UserDetailView.as_view(), name="user-detail"),
    path("csrf/", CSRFTokenView.as_view(), name="csrf-token"),
]
