from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.CourseViewSet, basename='course')

quiz_router = DefaultRouter()
quiz_router.register(r'', views.QuizViewSet, basename='quiz')

urlpatterns = [
    path('quizzes/', include(quiz_router.urls)),
    path('', include(router.urls)),
]
