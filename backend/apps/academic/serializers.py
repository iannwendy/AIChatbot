"""
Serializers for Academic API
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    AcademicYear, Semester, Major, StudentClass, Room,
    CourseSection, Schedule, AcademicCalendar, TuitionFee,
    Scholarship, Enrollment, AcademicRecord, StudentStatus,
    Announcement, StudentIDCard, LibraryRecord, Dormitory,
    DormitoryAssignment, HealthInsurance, Contact,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'


class SemesterSerializer(serializers.ModelSerializer):
    academic_year = AcademicYearSerializer(read_only=True)
    academic_year_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.all(), source='academic_year', write_only=True
    )

    class Meta:
        model = Semester
        fields = '__all__'


class MajorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Major
        fields = '__all__'


class StudentClassSerializer(serializers.ModelSerializer):
    major = MajorSerializer(read_only=True)
    major_id = serializers.PrimaryKeyRelatedField(
        queryset=Major.objects.all(), source='major', write_only=True
    )
    advisor = UserSerializer(read_only=True)
    students = UserSerializer(many=True, read_only=True)

    class Meta:
        model = StudentClass
        fields = '__all__'


class RoomSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='__str__', read_only=True)

    class Meta:
        model = Room
        fields = '__all__'


class ScheduleSerializer(serializers.ModelSerializer):
    course_section = serializers.StringRelatedField()
    room = RoomSerializer(read_only=True)

    class Meta:
        model = Schedule
        fields = '__all__'


class CourseSectionSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)
    room = RoomSerializer(read_only=True)

    class Meta:
        model = CourseSection
        fields = '__all__'


class AcademicCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicCalendar
        fields = '__all__'


class TuitionFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)

    class Meta:
        model = TuitionFee
        fields = '__all__'


class ScholarshipSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)

    class Meta:
        model = Scholarship
        fields = '__all__'


class EnrollmentSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course_section.course.code', read_only=True)
    course_name = serializers.CharField(source='course_section.course.name', read_only=True)
    section_number = serializers.CharField(source='course_section.section_number', read_only=True)
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'


class AcademicRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)

    class Meta:
        model = AcademicRecord
        fields = '__all__'


class StudentStatusSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)

    class Meta:
        model = StudentStatus
        fields = '__all__'


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    target_major_names = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = '__all__'

    def get_target_major_names(self, obj):
        return [m.name for m in obj.target_majors.all()]


class StudentIDCardSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)

    class Meta:
        model = StudentIDCard
        fields = '__all__'


class LibraryRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)

    class Meta:
        model = LibraryRecord
        fields = '__all__'


class DormitorySerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='__str__', read_only=True)
    available_spots = serializers.IntegerField(source='get_available_spots', read_only=True)

    class Meta:
        model = Dormitory
        fields = '__all__'


class DormitoryAssignmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    dormitory_name = serializers.CharField(source='dormitory.__str__', read_only=True)
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)

    class Meta:
        model = DormitoryAssignment
        fields = '__all__'


class HealthInsuranceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)

    class Meta:
        model = HealthInsurance
        fields = '__all__'


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'
