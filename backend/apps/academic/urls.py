from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'academic-years', views.AcademicYearViewSet, basename='academic-year')
router.register(r'semesters', views.SemesterViewSet, basename='semester')
router.register(r'majors', views.MajorViewSet, basename='major')
router.register(r'course-sections', views.CourseSectionViewSet, basename='course-section')
router.register(r'schedules', views.ScheduleViewSet, basename='schedule')
router.register(r'calendar', views.AcademicCalendarViewSet, basename='calendar')
router.register(r'tuition-fees', views.TuitionFeeViewSet, basename='tuition-fee')
router.register(r'scholarships', views.ScholarshipViewSet, basename='scholarship')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'academic-records', views.AcademicRecordViewSet, basename='academic-record')
router.register(r'announcements', views.AnnouncementViewSet, basename='announcement')
router.register(r'id-cards', views.StudentIDCardViewSet, basename='id-card')
router.register(r'library', views.LibraryRecordViewSet, basename='library')
router.register(r'dormitories', views.DormitoryViewSet, basename='dormitory')
router.register(r'dormitory-assignments', views.DormitoryAssignmentViewSet, basename='dormitory-assignment')
router.register(r'health-insurance', views.HealthInsuranceViewSet, basename='health-insurance')
router.register(r'contacts', views.ContactViewSet, basename='contact')

urlpatterns = [
    path('', include(router.urls)),
]
