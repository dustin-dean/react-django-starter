from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


class UserAdmin(UserAdmin):
    model = User
    list_display = ["email", "username", "is_staff", "is_active"]
    fieldsets = UserAdmin.fieldsets + (
        ("Additional Info", {"fields": ()}),  # Add custom fields here later
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Additional Info", {"fields": ()}),  # Add custom fields here later
    )


admin.site.register(User, UserAdmin)
