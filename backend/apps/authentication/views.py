from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model, login, logout
from django.shortcuts import redirect
from django.conf import settings
from social_django.utils import psa
from social_core.backends.google import GoogleOAuth2
from social_core.exceptions import AuthException
from .serializers import UserSerializer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def google_login(request):
    """Google OAuth login endpoint - redirect to Google"""
    from urllib.parse import urlencode

    # Get the full host for redirect URI
    host = request.get_host()
    protocol = 'https' if request.is_secure() else 'http'
    redirect_uri = f"{protocol}://{host}/api/auth/google/callback"

    base_url = 'https://accounts.google.com/o/oauth2/v2/auth'
    params = {
        'client_id': settings.SOCIAL_AUTH_GOOGLE_OAUTH2_KEY,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'consent',
    }

    if settings.SOCIAL_AUTH_GOOGLE_OAUTH2_KEY:
        auth_url = f"{base_url}?{urlencode(params)}"
        return Response({
            'auth_url': auth_url,
            'message': 'Redirect user to this URL for Google login'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': 'Google OAuth not configured. Please set GOOGLE_OAUTH2_CLIENT_ID in .env'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    """Google OAuth callback - exchange code for user"""
    from urllib.parse import urlencode
    import requests

    code = request.GET.get('code')
    error = request.GET.get('error')

    if error:
        return redirect(f"/login?error={error}")

    if not code:
        return redirect("/login?error=no_code")

    try:
        # Get the full host for token exchange
        host = request.get_host()
        protocol = 'https' if request.is_secure() else 'http'
        redirect_uri = f"{protocol}://{host}/api/auth/google/callback"

        # Exchange code for tokens
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'client_id': settings.SOCIAL_AUTH_GOOGLE_OAUTH2_KEY,
            'client_secret': settings.SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri,
        }

        token_response = requests.post(token_url, data=token_data)

        if token_response.status_code != 200:
            logger.error(f"Token exchange failed: {token_response.text}")
            return redirect("http://localhost:3000/login?error=token_exchange_failed")

        tokens = token_response.json()
        access_token = tokens.get('access_token')

        if not access_token:
            return redirect("http://localhost:3000/login?error=no_access_token")

        # Get user info from Google
        userinfo_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        headers = {'Authorization': f'Bearer {access_token}'}
        userinfo_response = requests.get(userinfo_url, headers=headers)

        if userinfo_response.status_code != 200:
            return redirect("http://localhost:3000/login?error=userinfo_failed")

        userinfo = userinfo_response.json()

        # Create or get user
        google_id = userinfo.get('id')
        email = userinfo.get('email')
        username = userinfo.get('email', '').split('@')[0]
        full_name = userinfo.get('name', '')
        avatar_url = userinfo.get('picture', '')

        # Find or create user
        user = User.objects.filter(google_id=google_id).first()

        if not user:
            # Check if user with this email exists
            user = User.objects.filter(email=email).first()
            if user:
                # Link Google account to existing user
                user.google_id = google_id
                if avatar_url and not user.avatar_url:
                    user.avatar_url = avatar_url
                user.save()
            else:
                # Create new user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    google_id=google_id,
                    avatar_url=avatar_url,
                    role='student'
                )

        # Log the user in
        login(request, user, backend='social_core.backends.google.GoogleOAuth2')

        # Redirect to frontend with success
        return redirect(f"http://localhost:3000/login?success=true&user_id={user.id}")

    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return redirect("http://localhost:3000/login?error=auth_failed")


class CurrentUserView(APIView):
    """Get current logged in user"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class LogoutView(APIView):
    """Logout endpoint"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'})


@psa('social:complete')
def social_auth_complete(request, backend):
    """Handle social auth completion"""
    # This is called after successful Google auth
    user = request.user

    # Get or create user data from social auth
    try:
        # Associate the social account with user
        social = user.social_auth.filter(provider='google-oauth2').first()
        if social:
            extra_data = social.extra_data
            # Update user avatar if available
            if 'picture' in extra_data and not user.avatar_url:
                user.avatar_url = extra_data['picture']
                user.save()

        return redirect(f'/login?success=true&user_id={user.id}')
    except Exception as e:
        logger.error(f"Social auth error: {e}")
        return redirect('/login?error=auth_failed')
