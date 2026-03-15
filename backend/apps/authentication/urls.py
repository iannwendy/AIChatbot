from django.urls import path
from . import views

urlpatterns = [
    path('google/', views.google_login, name='google_login'),
    path('google/callback', views.google_callback, name='google_callback'),
    path('admin-login/', views.admin_login, name='admin_login'),
    path('current-user/', views.CurrentUserView.as_view(), name='current_user'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('update-profile/', views.UpdateProfileView.as_view(), name='update_profile'),
    path('admin/stats/', views.AdminStatsView.as_view(), name='admin_stats'),
    path('teacher/stats/', views.TeacherStatsView.as_view(), name='teacher_stats'),
]
