from django.contrib import admin
from .models import (
    AcademicYear, Semester, Major, StudentClass, Room,
    CourseSection, Schedule, AcademicCalendar, TuitionFee,
    Scholarship, Enrollment, AcademicRecord, StudentStatus,
    Announcement, StudentIDCard, LibraryRecord, Dormitory,
    DormitoryAssignment, HealthInsurance, Contact,
)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['year', 'start_date', 'end_date', 'is_current']


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ['academic_year', 'semester', 'start_date', 'end_date', 'is_current']


@admin.register(Major)
class MajorAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'faculty', 'duration_years']


@admin.register(StudentClass)
class StudentClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'major', 'academic_year', 'advisor']


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['building', 'room_number', 'room_type', 'capacity']


@admin.register(CourseSection)
class CourseSectionAdmin(admin.ModelAdmin):
    list_display = ['course', 'semester', 'section_number', 'teacher', 'max_students', 'enrolled_count']


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['course_section', 'day_of_week', 'start_period', 'end_period', 'room']


@admin.register(AcademicCalendar)
class AcademicCalendarAdmin(admin.ModelAdmin):
    list_display = ['title', 'event_type', 'start_date', 'end_date']


@admin.register(TuitionFee)
class TuitionFeeAdmin(admin.ModelAdmin):
    list_display = ['student', 'semester', 'amount', 'payment_status', 'due_date']


@admin.register(Scholarship)
class ScholarshipAdmin(admin.ModelAdmin):
    list_display = ['student', 'name', 'amount', 'semester', 'is_active']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course_section', 'semester', 'status', 'grade']


@admin.register(AcademicRecord)
class AcademicRecordAdmin(admin.ModelAdmin):
    list_display = ['student', 'semester', 'gpa', 'cumulative_gpa', 'total_credits']


@admin.register(StudentStatus)
class StudentStatusAdmin(admin.ModelAdmin):
    list_display = ['student', 'status', 'semester', 'effective_date']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'priority', 'publish_date', 'is_active']


@admin.register(StudentIDCard)
class StudentIDCardAdmin(admin.ModelAdmin):
    list_display = ['student', 'card_number', 'issue_date', 'expiry_date', 'status']


@admin.register(LibraryRecord)
class LibraryRecordAdmin(admin.ModelAdmin):
    list_display = ['student', 'book_title', 'borrow_date', 'due_date', 'status']


@admin.register(Dormitory)
class DormitoryAdmin(admin.ModelAdmin):
    list_display = ['building', 'room_number', 'room_type', 'capacity', 'current_occupancy', 'price_per_semester']


@admin.register(DormitoryAssignment)
class DormitoryAssignmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'dormitory', 'semester', 'status', 'check_in_date']


@admin.register(HealthInsurance)
class HealthInsuranceAdmin(admin.ModelAdmin):
    list_display = ['student', 'insurance_number', 'issue_date', 'expiry_date', 'status']


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'department_type', 'phone', 'email', 'location']
