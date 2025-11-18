from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class CookieAuthenticationTestCase(TestCase):
    """Test cookie-based JWT authentication"""

    def setUp(self):
        self.client = APIClient()
        self.username = "testuser"
        self.password = "testpass123"
        self.user = User.objects.create_user(
            username=self.username,
            email="test@example.com",
            password=self.password
        )

    def test_login_sets_cookies(self):
        """Test that login sets access and refresh token cookies"""
        response = self.client.post(
            "/auth/jwt/create/",
            {"username": self.username, "password": self.password},
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)
        
        # Verify cookies are HttpOnly
        access_cookie = response.cookies["access_token"]
        refresh_cookie = response.cookies["refresh_token"]
        self.assertTrue(access_cookie.get("httponly", False))
        self.assertTrue(refresh_cookie.get("httponly", False))

    def test_protected_endpoint_with_cookie(self):
        """Test that protected endpoints work with cookie authentication"""
        # Login first
        login_response = self.client.post(
            "/auth/jwt/create/",
            {"username": self.username, "password": self.password},
            format="json"
        )
        
        # Access protected endpoint
        response = self.client.get("/api/protected/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"], self.username)

    def test_logout_clears_cookies(self):
        """Test that logout clears authentication cookies"""
        # Login first
        self.client.post(
            "/auth/jwt/create/",
            {"username": self.username, "password": self.password},
            format="json"
        )
        
        # Logout
        response = self.client.post("/auth/logout/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify cookies are cleared (max_age=0)
        access_cookie = response.cookies.get("access_token")
        refresh_cookie = response.cookies.get("refresh_token")
        
        if access_cookie:
            self.assertEqual(access_cookie.get("max-age"), 0)
        if refresh_cookie:
            self.assertEqual(refresh_cookie.get("max-age"), 0)

    def test_invalid_credentials(self):
        """Test that invalid credentials are rejected"""
        response = self.client.post(
            "/auth/jwt/create/",
            {"username": self.username, "password": "wrongpassword"},
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access_token", response.cookies)
        self.assertNotIn("refresh_token", response.cookies)

