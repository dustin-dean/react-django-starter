from django.contrib.auth import authenticate, login, logout
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from .serializers import LoginSerializer, UserSerializer


class LoginView(APIView):
    """
    Login endpoint using Django's session authentication.
    
    **How it works:**
    1. Client sends username and password via POST
    2. Django authenticates credentials using authenticate()
    3. If valid, login() creates a session and sets sessionid cookie
    4. Client receives user data and sessionid cookie (HttpOnly)
    5. Future requests automatically include sessionid cookie
    
    **Security features:**
    - HttpOnly cookie prevents JavaScript access (XSS protection)
    - SameSite=Lax prevents CSRF attacks
    - Secure flag in production ensures HTTPS only
    - Session stored in database for single-server deployment
    
    **For junior developers:**
    The sessionid cookie is set automatically by Django's login() function.
    You don't need to manually create or send cookies. The browser will
    automatically include this cookie in all subsequent requests to the API.
    """

    permission_classes = [AllowAny]  # Anyone can attempt to login
    serializer_class = LoginSerializer

    def post(self, request):
        """
        Authenticate user and create session.
        
        Request body:
            {
                "username": "string",
                "password": "string"
            }
        
        Response (200 OK):
            {
                "user": {
                    "id": 1,
                    "username": "john",
                    "email": "john@example.com",
                    "first_name": "John",
                    "last_name": "Doe"
                }
            }
            
        Response (400 Bad Request):
            {
                "error": "Invalid credentials"
            }
        """
        # Validate request data format
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        # Authenticate user credentials
        # This checks username/password against the database
        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Authentication successful - create session
            # This function does several things:
            # 1. Creates a session record in the database
            # 2. Generates a unique session ID
            # 3. Sets the sessionid cookie in the response
            # 4. Attaches user info to the session
            login(request, user)

            # Return user data to client
            # The sessionid cookie is automatically included in response headers
            user_serializer = UserSerializer(user)
            return Response(
                {"user": user_serializer.data},
                status=status.HTTP_200_OK
            )
        else:
            # Authentication failed - invalid credentials
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST
            )


class LogoutView(APIView):
    """
    Logout endpoint - destroys session and clears sessionid cookie.
    
    **How it works:**
    1. Client sends POST request with sessionid cookie
    2. Django validates the session
    3. logout() deletes session from database
    4. Response includes instruction to clear sessionid cookie
    5. Browser removes the cookie
    
    **For junior developers:**
    The logout() function handles all cleanup automatically:
    - Deletes the session record from the database
    - Tells the browser to delete the sessionid cookie
    - You don't need to manually manage any of this
    """

    permission_classes = [IsAuthenticated]  # Must be logged in to logout

    def post(self, request):
        """
        Logout current user and destroy session.
        
        Response (200 OK):
            {
                "message": "Successfully logged out"
            }
        """
        # Destroy session and clear cookie
        # This does:
        # 1. Deletes session from database
        # 2. Clears session data from request
        # 3. Sets cookie expiration to past date (tells browser to delete it)
        logout(request)

        return Response(
            {"message": "Successfully logged out"},
            status=status.HTTP_200_OK
        )


class CurrentUserView(APIView):
    """
    Get current authenticated user information.
    
    **How it works:**
    1. Client sends request with sessionid cookie
    2. SessionAuthentication middleware validates the session
    3. If valid, request.user is populated with user object
    4. View returns user data
    
    **Use case:**
    When app loads, frontend calls this endpoint to:
    - Check if user has an active session
    - Get user information for the UI
    - Determine if user needs to login
    
    **For junior developers:**
    The request.user object is automatically set by Django's authentication
    middleware. If the session is invalid/expired, request.user will be
    AnonymousUser and the IsAuthenticated permission will deny access.
    """

    permission_classes = [IsAuthenticated]  # Must have valid session

    def get(self, request):
        """
        Get current user information.
        
        Response (200 OK):
            {
                "user": {
                    "id": 1,
                    "username": "john",
                    "email": "john@example.com",
                    "first_name": "John",
                    "last_name": "Doe"
                }
            }
            
        Response (403 Forbidden) - if not authenticated:
            {
                "detail": "Authentication credentials were not provided."
            }
        """
        # request.user is set by SessionAuthentication middleware
        # It contains the User object for the authenticated session
        user_serializer = UserSerializer(request.user)
        return Response(
            {"user": user_serializer.data},
            status=status.HTTP_200_OK
        )


class ProtectedView(APIView):
    """
    Example protected endpoint that requires authentication.
    
    This demonstrates how session authentication protects endpoints.
    Any endpoint with IsAuthenticated permission requires a valid session.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {"message": "This is a protected endpoint", "user": request.user.username}
        )
