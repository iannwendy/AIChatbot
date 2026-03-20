"""
API views for Academic data - used by the function calling system.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    AcademicYear, Semester, Major, StudentClass, Room,
    CourseSection, Schedule, AcademicCalendar, TuitionFee,
    Scholarship, Enrollment, AcademicRecord, StudentStatus,
    Announcement, StudentIDCard, LibraryRecord, Dormitory,
    DormitoryAssignment, HealthInsurance, Contact,
)
from .serializers import (
    AcademicYearSerializer, SemesterSerializer, MajorSerializer,
    StudentClassSerializer, RoomSerializer, CourseSectionSerializer,
    ScheduleSerializer, AcademicCalendarSerializer, TuitionFeeSerializer,
    ScholarshipSerializer, EnrollmentSerializer, AcademicRecordSerializer,
    StudentStatusSerializer, AnnouncementSerializer, StudentIDCardSerializer,
    LibraryRecordSerializer, DormitorySerializer, DormitoryAssignmentSerializer,
    HealthInsuranceSerializer, ContactSerializer,
)


class AcademicYearViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current academic year"""
        year = AcademicYear.objects.filter(is_current=True).first()
        if year:
            return Response(AcademicYearSerializer(year).data)
        return Response({'error': 'No current academic year'}, status=404)


class SemesterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current semester"""
        semester = Semester.objects.filter(is_current=True).first()
        if semester:
            return Response(SemesterSerializer(semester).data)
        return Response({'error': 'No current semester'}, status=404)


class MajorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Major.objects.all()
    serializer_class = MajorSerializer
    permission_classes = [IsAuthenticated]


class CourseSectionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CourseSection.objects.select_related('course', 'teacher', 'semester', 'room')
        semester_id = self.request.query_params.get('semester')
        course_id = self.request.query_params.get('course')
        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs


class ScheduleViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Schedule.objects.select_related('course_section', 'room')
        student_id = self.request.query_params.get('student')
        semester_id = self.request.query_params.get('semester')

        if student_id:
            enrolled_sections = Enrollment.objects.filter(
                student_id=student_id
            ).values_list('course_section_id', flat=True)
            qs = qs.filter(course_section_id__in=enrolled_sections)

        if semester_id:
            qs = qs.filter(course_section__semester_id=semester_id)

        return qs

    @action(detail=False, methods=['get'])
    def my_schedule(self, request):
        """Get current user's schedule for current semester"""
        current_semester = Semester.objects.filter(is_current=True).first()
        if not current_semester:
            return Response({'error': 'No current semester found'}, status=404)

        enrolled_sections = Enrollment.objects.filter(
            student=request.user,
            semester=current_semester,
        ).values_list('course_section_id', flat=True)

        schedules = Schedule.objects.filter(
            course_section_id__in=enrolled_sections
        ).select_related('course_section__course', 'room')

        return Response(ScheduleSerializer(schedules, many=True).data)


class AcademicCalendarViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AcademicCalendarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AcademicCalendar.objects.all()
        event_type = self.request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)
        return qs


class TuitionFeeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TuitionFeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TuitionFee.objects.filter(student=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current semester tuition fee"""
        current_semester = Semester.objects.filter(is_current=True).first()
        if not current_semester:
            return Response({'error': 'No current semester found'}, status=404)

        fee = TuitionFee.objects.filter(
            student=request.user,
            semester=current_semester,
        ).first()

        if fee:
            return Response(TuitionFeeSerializer(fee).data)
        return Response({'error': 'No tuition fee found'}, status=404)


class ScholarshipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ScholarshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Scholarship.objects.filter(student=self.request.user)


class EnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Enrollment.objects.filter(
            student=self.request.user
        ).select_related('course_section__course', 'semester')
        semester_id = self.request.query_params.get('semester')
        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        return qs


class AcademicRecordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AcademicRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AcademicRecord.objects.filter(student=self.request.user)


class AnnouncementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Announcement.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class StudentIDCardViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentIDCardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudentIDCard.objects.filter(student=self.request.user)


class LibraryRecordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LibraryRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LibraryRecord.objects.filter(student=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get currently borrowed books"""
        records = LibraryRecord.objects.filter(
            student=request.user,
            status__in=['borrowed', 'overdue'],
        )
        return Response(LibraryRecordSerializer(records, many=True).data)


class DormitoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Dormitory.objects.all()
    serializer_class = DormitorySerializer
    permission_classes = [IsAuthenticated]


class DormitoryAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DormitoryAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DormitoryAssignment.objects.filter(student=self.request.user)


class HealthInsuranceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HealthInsuranceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HealthInsurance.objects.filter(student=self.request.user)


class ContactViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Contact.objects.filter(is_active=True)
        department_type = self.request.query_params.get('type')
        if department_type:
            qs = qs.filter(department_type=department_type)
        return qs
