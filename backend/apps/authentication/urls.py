from django.urls import path
from . import views

urlpatterns = [
    path('google/', views.google_login, name='google_login'),
    path('google/callback', views.google_callback, name='google_callback'),
    path('current-user/', views.CurrentUserView.as_view(), name='current_user'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
]
