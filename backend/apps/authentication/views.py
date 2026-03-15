from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model, login, logout
from django.shortcuts import redirect
from django.conf import settings
from django.middleware.csrf import get_token
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

        # Split full name into first/last
        name_parts = full_name.split(' ', 1) if full_name else ['']
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

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
                if full_name and not user.first_name:
                    user.first_name = first_name
                    user.last_name = last_name
                user.save()
            else:
                # Create new user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    google_id=google_id,
                    avatar_url=avatar_url,
                    first_name=first_name,
                    last_name=last_name,
                    role='student'
                )
        else:
            # Returning user - always update avatar from Google to ensure it's current
            if avatar_url:
                user.avatar_url = avatar_url
            if full_name and not user.first_name:
                user.first_name = first_name
                user.last_name = last_name
            user.save()

        # Log the user in
        login(request, user, backend='social_core.backends.google.GoogleOAuth2')

        # Redirect to frontend with success
        return redirect(f"http://localhost:3000/login?success=true&user_id={user.id}")

    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return redirect("http://localhost:3000/login?error=auth_failed")


from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def admin_login(request):
    """Hardcoded admin login for development"""
    username = request.data.get('username')
    password = request.data.get('password')

    if username == 'admin' and password == 'pass123':
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={'role': 'admin', 'is_staff': True, 'is_superuser': True}
        )
        # Always ensure admin privileges are set
        if not user.is_staff or not user.is_superuser or user.role != 'admin':
            user.role = 'admin'
            user.is_staff = True
            user.is_superuser = True
            user.save()
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        return Response({
            'success': True,
            'user_id': user.id,
            'role': user.role,
        })

    return Response({'error': 'Sai tài khoản hoặc mật khẩu'}, status=status.HTTP_401_UNAUTHORIZED)


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


class UpdateProfileView(APIView):
    """Update current user profile"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        data = request.data

        # Update allowed fields
        if 'full_name' in data:
            name_parts = data['full_name'].split(' ', 1)
            user.first_name = name_parts[0]
            user.last_name = name_parts[1] if len(name_parts) > 1 else ''

        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']

        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)


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


class AdminStatsView(APIView):
    """Get admin dashboard statistics"""
    permission_classes = [IsAuthenticated]

    def _get_user_display_name(self, user):
        name = f"{user.first_name} {user.last_name}".strip()
        return name if name else user.username

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        from apps.courses.models import Course
        from apps.documents.models import Document

        # Count users by role from User model directly
        total_students = User.objects.filter(role='student').count()
        total_teachers = User.objects.filter(role='teacher').count()
        total_courses = Course.objects.count()
        total_documents = Document.objects.count()

        # Recent documents
        recent_documents = Document.objects.select_related('course', 'uploaded_by').order_by('-created_at')[:5]
        recent_docs_data = [{
            'id': doc.id,
            'title': doc.title,
            'course': doc.course.name if doc.course else None,
            'uploaded_by': self._get_user_display_name(doc.uploaded_by) if doc.uploaded_by else None,
            'created_at': doc.created_at.isoformat(),
        } for doc in recent_documents]

        # Recent courses
        recent_courses = Course.objects.select_related('teacher').order_by('-created_at')[:5]
        recent_courses_data = [{
            'id': course.id,
            'name': course.name,
            'code': course.code,
            'teacher': self._get_user_display_name(course.teacher) if course.teacher else None,
            'student_count': course.students.count(),
            'created_at': course.created_at.isoformat(),
        } for course in recent_courses]

        return Response({
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_courses': total_courses,
            'total_documents': total_documents,
            'recent_documents': recent_docs_data,
            'recent_courses': recent_courses_data,
        })


class TeacherStatsView(APIView):
    """Get teacher dashboard statistics"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'teacher':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        from apps.courses.models import Course
        from apps.documents.models import Document

        # Get teacher's courses
        my_courses = Course.objects.filter(teacher=request.user)
        total_courses = my_courses.count()

        # Get total students in teacher's courses
        total_students = 0
        for course in my_courses:
            total_students += course.students.count()

        # Get teacher's documents
        my_documents = Document.objects.filter(uploaded_by=request.user)
        total_documents = my_documents.count()

        # Recent documents
        recent_docs = my_documents.select_related('course').order_by('-created_at')[:5]
        recent_docs_data = [{
            'id': doc.id,
            'title': doc.title,
            'course': doc.course.name if doc.course else None,
            'file_type': doc.file_type,
            'is_processed': doc.is_processed,
            'created_at': doc.created_at.isoformat(),
        } for doc in recent_docs]

        # Courses with student counts
        courses_data = [{
            'id': course.id,
            'name': course.name,
            'code': course.code,
            'student_count': course.students.count(),
            'document_count': course.documents.count(),
        } for course in my_courses]

        return Response({
            'total_courses': total_courses,
            'total_students': total_students,
            'total_documents': total_documents,
            'recent_documents': recent_docs_data,
            'courses': courses_data,
        })
