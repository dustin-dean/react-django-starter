from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from rest_framework import serializers
from .models import User


class UserCreateSerializer(BaseUserCreateSerializer):
    """
    Serializer for user registration via Djoser.
    Extends Djoser's base serializer to use our custom User model.
    """

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ("id", "email", "username", "password")


class UserSerializer(BaseUserSerializer):
    """
    Serializer for user data responses.
    Used to return user information after authentication or in profile endpoints.
    Does not include password for security.
    """

    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ("id", "email", "username", "first_name", "last_name")
        # Add any additional fields you want to expose


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login requests.
    Validates username and password for session authentication.
    
    Note: This does NOT authenticate the user - it only validates the input format.
    Actual authentication happens in the view using Django's authenticate() function.
    """

    username = serializers.CharField(
        required=True,
        help_text="Username for authentication"
    )
    password = serializers.CharField(
        required=True,
        write_only=True,  # Never return password in response
        style={"input_type": "password"},  # Hint for browsable API
        help_text="Password for authentication"
    )

    def validate(self, attrs):
        """
        Validate that both username and password are provided.
        Additional authentication validation happens in the view.
        """
        username = attrs.get("username")
        password = attrs.get("password")

        if not username or not password:
            raise serializers.ValidationError(
                "Both username and password are required."
            )

        return attrs
