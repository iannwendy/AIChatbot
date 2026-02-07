from django.urls import path
from . import views

urlpatterns = [
    path('google/', views.google_login, name='google_login'),
]
