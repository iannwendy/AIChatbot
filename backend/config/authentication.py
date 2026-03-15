from rest_framework.authentication import SessionAuthentication, BaseAuthentication
from rest_framework.permissions import BasePermission
from rest_framework import exceptions
from django.contrib.auth import get_user_model

User = get_user_model()


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Session auth without CSRF enforcement for cross-origin API requests."""

    def enforce_csrf(self, request):
        return  # Skip CSRF check


class AdminRolePermission(BasePermission):
    """
    Custom permission that checks if user has role='admin'.
    Works with both session auth and token auth.
    """
    message = 'Bạn cần quyền admin để thực hiện thao tác này.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'admin'


class AdminOrTeacherPermission(BasePermission):
    """Permission for admin or teacher role"""
    message = 'Bạn cần quyền admin hoặc giáo viên để thực hiện thao tác này.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['admin', 'teacher']


class TokenAuthentication(BaseAuthentication):
    """
    Simple token-based authentication for API requests.
    Token format: admin_{user_id}_{timestamp}
    """
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0] != 'Bearer':
            return None

        token = parts[1]

        # Parse admin token: admin_{user_id}_{timestamp}
        if token.startswith('admin_'):
            try:
                parts = token.split('_')
                if len(parts) >= 2:
                    user_id = int(parts[1])
                    user = User.objects.filter(id=user_id, role='admin').first()
                    if user:
                        return (user, token)
            except (ValueError, IndexError):
                pass

        return None

    def authenticate_header(self, request):
        return self.keyword
