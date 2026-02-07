from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """Google OAuth login endpoint - placeholder"""
    # TODO: Implement Google OAuth authentication
    return Response({'message': 'Google login endpoint - to be implemented'}, 
                    status=status.HTTP_200_OK)
