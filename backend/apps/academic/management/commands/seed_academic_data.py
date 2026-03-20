"""
Management command to seed mock administrative data for testing.

Usage:
    python manage.py seed_academic_data
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random

from apps.academic.models import (
    AcademicYear, Semester, Major, StudentClass, Room,
    CourseSection, Schedule, AcademicCalendar, TuitionFee,
    Scholarship, Enrollment, AcademicRecord, StudentStatus,
    Announcement, StudentIDCard, LibraryRecord, Dormitory,
    DormitoryAssignment, HealthInsurance, Contact,
)
from apps.courses.models import Course

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed mock administrative data for the chatbot'

    def handle(self, *args, **options):
        self.stdout.write('Starting to seed administrative data...')

        # Clear existing data (optional - comment out to keep existing)
        self.clear_data()

        # Create data
        academic_years = self.create_academic_years()
        semesters = self.create_semesters(academic_years)
        majors = self.create_majors()
        rooms = self.create_rooms()
        contacts = self.create_contacts()

        # Get or create courses
        courses = Course.objects.all()[:5]

        # Get or create users for testing
        students = self.get_or_create_students()
        teachers = self.get_or_create_teachers()

        # Create classes
        self.create_student_classes(majors, academic_years, students)

        # Create course sections and schedules
        self.create_course_sections(courses, semesters, teachers, rooms)

        # Create academic calendar
        self.create_academic_calendar(academic_years)

        # Create tuition fees
        self.create_tuition_fees(students, semesters)

        # Create scholarships
        self.create_scholarships(students, semesters)

        # Create enrollments and academic records
        self.create_enrollments_and_records(students, semesters, courses)

        # Create announcements
        self.create_announcements()

        # Create student ID cards
        self.create_student_id_cards(students)

        # Create library records
        self.create_library_records(students)

        # Create dormitories and assignments
        self.create_dormitories_and_assignments(students, semesters)

        # Create health insurance
        self.create_health_insurances(students)

        self.stdout.write(self.style.SUCCESS('Successfully seeded administrative data!'))

    def clear_data(self):
        """Clear existing data"""
        self.stdout.write('Clearing existing data...')
        DormitoryAssignment.objects.all().delete()
        Dormitory.objects.all().delete()
        LibraryRecord.objects.all().delete()
        StudentIDCard.objects.all().delete()
        Announcement.objects.all().delete()
        AcademicRecord.objects.all().delete()
        Enrollment.objects.all().delete()
        Scholarship.objects.all().delete()
        TuitionFee.objects.all().delete()
        Schedule.objects.all().delete()
        CourseSection.objects.all().delete()
        AcademicCalendar.objects.all().delete()
        StudentStatus.objects.all().delete()
        Contact.objects.all().delete()
        HealthInsurance.objects.all().delete()
        StudentClass.objects.all().delete()
        Major.objects.all().delete()
        Semester.objects.all().delete()
        AcademicYear.objects.all().delete()
        Room.objects.all().delete()

    def create_academic_years(self):
        """Create academic years"""
        self.stdout.write('Creating academic years...')

        years_data = [
            {'year': '2023-2024', 'start_date': '2023-09-01', 'end_date': '2024-08-31', 'is_current': False},
            {'year': '2024-2025', 'start_date': '2024-09-01', 'end_date': '2025-08-31', 'is_current': True},
            {'year': '2025-2026', 'start_date': '2025-09-01', 'end_date': '2026-08-31', 'is_current': False},
        ]

        years = []
        for data in years_data:
            year, _ = AcademicYear.objects.update_or_create(
                year=data['year'],
                defaults={
                    'start_date': data['start_date'],
                    'end_date': data['end_date'],
                    'is_current': data['is_current'],
                }
            )
            years.append(year)

        return years

    def create_semesters(self, academic_years):
        """Create semesters"""
        self.stdout.write('Creating semesters...')

        semesters = []

        # 2023-2024
        semester_data_2023 = [
            {'semester': 1, 'start_date': '2023-09-01', 'end_date': '2024-01-15', 'is_current': False},
            {'semester': 2, 'start_date': '2024-01-16', 'end_date': '2024-05-31', 'is_current': False},
            {'semester': 3, 'start_date': '2024-06-01', 'end_date': '2024-08-15', 'is_current': False},
        ]

        # 2024-2025 (current)
        semester_data_2024 = [
            {'semester': 1, 'start_date': '2024-09-01', 'end_date': '2025-01-15', 'is_current': False},
            {'semester': 2, 'start_date': '2025-01-16', 'end_date': '2025-05-31', 'is_current': True},
            {'semester': 3, 'start_date': '2025-06-01', 'end_date': '2025-08-15', 'is_current': False},
        ]

        for year in academic_years:
            if year.year == '2023-2024':
                data = semester_data_2023
            else:
                data = semester_data_2024

            for sd in data:
                semester, _ = Semester.objects.update_or_create(
                    academic_year=year,
                    semester=sd['semester'],
                    defaults={
                        'start_date': sd['start_date'],
                        'end_date': sd['end_date'],
                        'is_current': sd['is_current'],
                        'registration_start': (datetime.strptime(sd['start_date'], '%Y-%m-%d') - timedelta(days=14)).strftime('%Y-%m-%d'),
                        'registration_end': sd['start_date'],
                    }
                )
                semesters.append(semester)

        semesters = list(Semester.objects.all().order_by('academic_year__year', 'semester'))

        return semesters

    def create_majors(self):
        """Create majors"""
        self.stdout.write('Creating majors...')

        majors_data = [
            {'code': 'CS', 'name': 'Khoa học Máy tính', 'faculty': 'Khoa Công nghệ Thông tin', 'duration_years': 4},
            {'code': 'IT', 'name': 'Công nghệ Thông tin', 'faculty': 'Khoa Công nghệ Thông tin', 'duration_years': 4},
            {'code': 'SE', 'name': 'Kỹ thuật Phần mềm', 'faculty': 'Khoa Công nghệ Thông tin', 'duration_years': 4},
            {'code': 'AI', 'name': 'Trí tuệ Nhân tạo', 'faculty': 'Khoa Công nghệ Thông tin', 'duration_years': 4},
            {'code': 'CE', 'name': 'Kỹ thuật Máy tính', 'faculty': 'Khoa Công nghệ Thông tin', 'duration_years': 4},
            {'code': 'BA', 'name': 'Quản trị Kinh doanh', 'faculty': 'Khoa Kinh tế', 'duration_years': 4},
            {'code': 'EE', 'name': 'Kỹ thuật Điện', 'faculty': 'Khoa Kỹ thuật', 'duration_years': 4},
            {'code': 'ME', 'name': 'Kỹ thuật Cơ khí', 'faculty': 'Khoa Kỹ thuật', 'duration_years': 4},
        ]

        majors = []
        for data in majors_data:
            major, _ = Major.objects.update_or_create(
                code=data['code'],
                defaults=data
            )
            majors.append(major)

        return majors

    def create_rooms(self):
        """Create rooms"""
        self.stdout.write('Creating rooms...')

        rooms_data = []
        buildings = ['A1', 'A2', 'B1', 'B2', 'C1']
        room_types = ['lecture', 'lab', 'seminar', 'exam']

        for building in buildings:
            for i in range(1, 21):
                room_types_for_building = random.choice([
                    ['lecture'] * 10 + ['lab'] * 5 + ['seminar'] * 3 + ['exam'] * 2,
                    ['lecture'] * 8 + ['lab'] * 8 + ['seminar'] * 2 + ['exam'] * 2,
                ])
                room_type = random.choice(room_types_for_building)
                capacity = random.choice([30, 50, 75, 100, 150]) if room_type == 'lecture' else random.choice([20, 30, 40])
                room, _ = Room.objects.get_or_create(
                    building=building,
                    room_number=str(i),
                    defaults={
                        'room_type': room_type,
                        'capacity': capacity,
                        'equipment': ['projector', 'air_conditioner'] if random.random() > 0.3 else ['projector'],
                    }
                )
                rooms_data.append(room)

        return rooms_data

    def get_or_create_students(self):
        """Get or create student users"""
        self.stdout.write('Getting/creating students...')

        students = []
        student_data = [
            {'username': 'student1', 'first_name': 'Nguyễn', 'last_name': 'Văn A', 'email': 'student1@example.com'},
            {'username': 'student2', 'first_name': 'Trần', 'last_name': 'Thị B', 'email': 'student2@example.com'},
            {'username': 'student3', 'first_name': 'Lê', 'last_name': 'Văn C', 'email': 'student3@example.com'},
            {'username': 'student4', 'first_name': 'Phạm', 'last_name': 'Thị D', 'email': 'student4@example.com'},
            {'username': 'student5', 'first_name': 'Hoàng', 'last_name': 'Văn E', 'email': 'student5@example.com'},
        ]

        for data in student_data:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'email': data['email'],
                    'role': 'student',
                    'is_active': True,
                }
            )
            students.append(user)

        return students

    def get_or_create_teachers(self):
        """Get or create teacher users"""
        self.stdout.write('Getting/creating teachers...')

        teachers = []
        teacher_data = [
            {'username': 'teacher1', 'first_name': 'TS. Nguyễn', 'last_name': 'Văn X', 'email': 'teacher1@example.com'},
            {'username': 'teacher2', 'first_name': 'PGS. Trần', 'last_name': 'Thị Y', 'email': 'teacher2@example.com'},
            {'username': 'teacher3', 'first_name': 'ThS. Lê', 'last_name': 'Văn Z', 'email': 'teacher3@example.com'},
        ]

        for data in teacher_data:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'email': data['email'],
                    'role': 'teacher',
                    'is_active': True,
                }
            )
            teachers.append(user)

        return teachers

    def create_student_classes(self, majors, academic_years, students):
        """Create student classes"""
        self.stdout.write('Creating student classes...')

        year_2024 = next((y for y in academic_years if y.year == '2024-2025'), academic_years[0])

        for i, major in enumerate(majors[:5]):
            for j in range(1, 3):
                class_name = f"{major.code}{year_2024.year[:4]}-{j:02d}"
                student_class, _ = StudentClass.objects.get_or_create(
                    name=class_name,
                    major=major,
                    academic_year=year_2024,
                    defaults={'advisor': random.choice(students[:2]) if students else None}
                )

                # Add some students to class
                for student in students[:random.randint(2, 4)]:
                    student_class.students.add(student)

    def create_course_sections(self, courses, semesters, teachers, rooms):
        """Create course sections and schedules"""
        self.stdout.write('Creating course sections and schedules...')

        current_semester = next((s for s in semesters if s.is_current), semesters[-1])
        previous_semester = next((s for s in semesters if not s.is_current and s.semester == 1), semesters[0])

        for course in courses:
            for i, semester in enumerate([previous_semester, current_semester]):
                for j in range(1, 3):
                    section, created = CourseSection.objects.get_or_create(
                        course=course,
                        semester=semester,
                        section_number=f"{j:02d}",
                        defaults={
                            'teacher': random.choice(teachers),
                            'room': random.choice(rooms) if rooms else None,
                            'max_students': random.choice([50, 75, 100]),
                            'enrolled_count': random.randint(20, 60),
                            'credits': random.choice([2, 3, 4]),
                        }
                    )

                    if created:
                        # Add schedule
                        for day in random.sample([2, 3, 4, 5, 6], random.randint(2, 3)):
                            Schedule.objects.create(
                                course_section=section,
                                day_of_week=day,
                                start_period=random.randint(1, 5),
                                end_period=random.randint(4, 8),
                                room=random.choice(rooms) if rooms else None,
                            )

    def create_academic_calendar(self, academic_years):
        """Create academic calendar events"""
        self.stdout.write('Creating academic calendar...')

        year_2024_2025 = next((y for y in academic_years if y.year == '2024-2025'), academic_years[0])

        events_data = [
            {'event_type': 'orientation', 'title': 'Tuần sinh hoạt công dân', 'start_date': '2024-09-02', 'end_date': '2024-09-07'},
            {'event_type': 'registration', 'title': 'Đăng ký học phần học kỳ 1', 'start_date': '2024-08-15', 'end_date': '2024-08-30'},
            {'event_type': 'holiday', 'title': 'Quốc khánh 2/9', 'start_date': '2024-09-02', 'end_date': '2024-09-02'},
            {'event_type': 'holiday', 'title': 'Tết Trung thu', 'start_date': '2024-09-17', 'end_date': '2024-09-17'},
            {'event_type': 'exam_period', 'title': 'Thi giữa kỳ học kỳ 1', 'start_date': '2024-10-21', 'end_date': '2024-11-01'},
            {'event_type': 'holiday', 'title': 'Nghỉ Tết Dương lịch', 'start_date': '2025-01-01', 'end_date': '2025-01-01'},
            {'event_type': 'exam_period', 'title': 'Thi cuối kỳ học kỳ 1', 'start_date': '2025-01-06', 'end_date': '2025-01-15'},
            {'event_type': 'registration', 'title': 'Đăng ký học phần học kỳ 2', 'start_date': '2024-12-15', 'end_date': '2024-12-30'},
            {'event_type': 'holiday', 'title': 'Tết Nguyên đán 2025', 'start_date': '2025-01-25', 'end_date': '2025-02-02'},
            {'event_type': 'graduation', 'title': 'Lễ tốt nghiệp đợt 1', 'start_date': '2025-06-15', 'end_date': '2025-06-16'},
            {'event_type': 'holiday', 'title': 'Nghỉ hè', 'start_date': '2025-06-01', 'end_date': '2025-08-31'},
        ]

        for data in events_data:
            AcademicCalendar.objects.get_or_create(
                academic_year=year_2024_2025,
                event_type=data['event_type'],
                title=data['title'],
                defaults={
                    'start_date': data['start_date'],
                    'end_date': data.get('end_date', data['start_date']),
                }
            )

    def create_tuition_fees(self, students, semesters):
        """Create tuition fees"""
        self.stdout.write('Creating tuition fees...')

        current_semester = next((s for s in semesters if s.is_current), semesters[-1])

        for student in students:
            for semester in semesters[:3]:
                is_paid = semester != current_semester
                TuitionFee.objects.get_or_create(
                    student=student,
                    semester=semester,
                    defaults={
                        'amount': Decimal(random.randint(5000000, 15000000)),
                        'discount': Decimal(0) if random.random() > 0.1 else Decimal(random.randint(500000, 2000000)),
                        'due_date': semester.start_date - timedelta(days=30),
                        'payment_status': 'paid' if is_paid else random.choice(['pending', 'overdue']),
                        'payment_date': semester.start_date - timedelta(days=random.randint(1, 25)) if is_paid else None,
                    }
                )

    def create_scholarships(self, students, semesters):
        """Create scholarships"""
        self.stdout.write('Creating scholarships...')

        scholarship_names = [
            'Học bổng khuyến khích học tập loại A',
            'Học bổng khuyến khích học tập loại B',
            'Học bổng tài năng sinh viên',
            'Học bổng Vingroup',
            'Học bổng FPT',
            'Học bổng chính phủ',
        ]

        for student in students[:3]:
            for semester in semesters[:2]:
                if random.random() > 0.5:
                    Scholarship.objects.get_or_create(
                        student=student,
                        semester=semester,
                        defaults={
                            'scholarship_type': random.choice(['merit', 'talent', 'government']),
                            'name': random.choice(scholarship_names),
                            'amount': Decimal(random.randint(1000000, 10000000)),
                            'awarded_date': semester.start_date - timedelta(days=random.randint(1, 30)),
                            'is_active': True,
                        }
                    )

    def create_enrollments_and_records(self, students, semesters, courses):
        """Create enrollments and academic records"""
        self.stdout.write('Creating enrollments and academic records...')

        previous_semester = semesters[0]  # Fall 2023
        current_semester = semesters[3]   # Spring 2025 (current)

        grades = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']

        for student in students:
            # Create enrollments for previous semester (with grades)
            for course in courses[:3]:
                section = CourseSection.objects.filter(course=course, semester=previous_semester).first()
                if not section:
                    continue
                midterm = Decimal(str(random.randint(60, 99)))
                final = Decimal(str(random.randint(60, 99)))
                total = Decimal(str(random.randint(60, 99)))
                Enrollment.objects.get_or_create(
                    student=student,
                    course_section=section,
                    defaults={
                        'semester': previous_semester,
                        'status': 'approved',
                        'midterm_score': midterm,
                        'final_score': final,
                        'total_score': total,
                        'grade': random.choice(grades),
                    }
                )

            # Create current enrollments (no grades yet)
            for course in courses[:4]:
                section = CourseSection.objects.filter(course=course, semester=current_semester).first()
                if section:
                    Enrollment.objects.get_or_create(
                        student=student,
                        course_section=section,
                        defaults={
                            'semester': current_semester,
                            'status': random.choice(['registered', 'approved']),
                        }
                    )

            # Create academic records
            gpa = Decimal(str(random.randint(60, 95))) / Decimal('10')
            cumulative_gpa = Decimal(str(random.randint(65, 90))) / Decimal('10')

            AcademicRecord.objects.get_or_create(
                student=student,
                semester=previous_semester,
                defaults={
                    'gpa': gpa,
                    'total_credits': random.randint(15, 20),
                    'earned_credits': random.randint(14, 20),
                    'cumulative_gpa': cumulative_gpa,
                    'cumulative_credits': random.randint(30, 60),
                }
            )

    def create_announcements(self):
        """Create announcements"""
        self.stdout.write('Creating announcements...')

        announcements_data = [
            {
                'title': 'Thông báo về lịch thi cuối kỳ học kỳ 2 năm học 2024-2025',
                'content': 'Kính gửi các sinh viên, Phòng Đào tạo thông báo lịch thi cuối kỳ học kỳ 2 năm học 2024-2025 như sau:\n\n1. Thời gian thi: 06/01/2025 - 15/01/2025\n2. Sinh viên mang theo thẻ sinh viên khi dự thi\n3. Không được mang điện thoại vào phòng thi\n4. Xuất trình giấy tờ ID trước khi vào phòng thi',
                'category': 'exam',
                'priority': 'high',
                'publish_date': datetime.now() - timedelta(days=2),
            },
            {
                'title': 'Đăng ký học phần học kỳ hè năm học 2024-2025',
                'content': 'Thông báo về việc đăng ký học phần học kỳ hè:\n\n- Thời gian đăng ký: 15/05/2025 - 30/05/2025\n- Đăng ký online qua hệ thống CMS\n- Lưu ý: Số lượng chỗ có hạn, đăng ký sớm để đảm bảo chỗ',
                'category': 'registration',
                'priority': 'normal',
                'publish_date': datetime.now() - timedelta(days=5),
            },
            {
                'title': 'Thông báo học phí học kỳ 2 năm học 2024-2025',
                'content': 'Kính gửi sinh viên, Học phí học kỳ 2 năm học 2024-2025 như sau:\n\n- Hạn nộp: 25/01/2025\n- Sinh viên nộp qua chuyển khoản ngân hàng\n- Mã sinh viên là mã thanh toán\n- Liên hệ Phòng Tài chính nếu có thắc mắc',
                'category': 'tuition',
                'priority': 'high',
                'publish_date': datetime.now() - timedelta(days=3),
            },
            {
                'title': 'Thông báo nghỉ Tết Nguyên đán 2025',
                'content': 'Trường thông báo lịch nghỉ Tết Nguyên đán 2025:\n\n- Nghỉ từ ngày 25/01/2025 đến hết ngày 02/02/2025\n- Ngày học lại: 03/02/2025\n- Chúc các bạn Tết vui vẻ và an toàn!',
                'category': 'academic',
                'priority': 'normal',
                'publish_date': datetime.now() - timedelta(days=10),
            },
            {
                'title': 'Học bổng khuyến khích học tập năm học 2024-2025',
                'content': 'Thông báo về việc xét cấp học bổng khuyến khích học tập năm học 2024-2025:\n\n- Điều kiện: Điểm trung bình từ 7.5 trở lên\n- Hạn nộp hồ sơ: 15/03/2025\n- Liên hệ Phòng Công tác Sinh viên để biết thêm chi tiết',
                'category': 'scholarship',
                'priority': 'normal',
                'publish_date': datetime.now() - timedelta(days=7),
            },
        ]

        for data in announcements_data:
            Announcement.objects.get_or_create(
                title=data['title'],
                defaults={
                    'content': data['content'],
                    'category': data['category'],
                    'priority': data['priority'],
                    'publish_date': data['publish_date'],
                    'is_active': True,
                }
            )

    def create_student_id_cards(self, students):
        """Create student ID cards"""
        self.stdout.write('Creating student ID cards...')

        for student in students:
            StudentIDCard.objects.get_or_create(
                student=student,
                defaults={
                    'card_number': f'SV{student.id:06d}',
                    'issue_date': '2024-09-01',
                    'expiry_date': '2028-08-31',
                    'status': 'active',
                }
            )

    def create_library_records(self, students):
        """Create library records"""
        self.stdout.write('Creating library records...')

        books = [
            {'title': 'Introduction to Algorithms', 'author': 'Thomas H. Cormen'},
            {'title': 'Clean Code', 'author': 'Robert C. Martin'},
            {'title': 'Design Patterns', 'author': 'Gang of Four'},
            {'title': 'The Pragmatic Programmer', 'author': 'David Thomas'},
            {'title': 'Computer Networks', 'author': 'Andrew Tanenbaum'},
        ]

        for student in students:
            # Some students have borrowed books
            if random.random() > 0.4:
                book = random.choice(books)
                is_returned = random.random() > 0.3
                borrow_date = datetime.now().date() - timedelta(days=random.randint(1, 30))

                LibraryRecord.objects.get_or_create(
                    student=student,
                    book_title=book['title'],
                    defaults={
                        'book_author': book['author'],
                        'borrow_date': borrow_date,
                        'due_date': borrow_date + timedelta(days=14),
                        'return_date': borrow_date + timedelta(days=random.randint(5, 14)) if is_returned else None,
                        'status': 'returned' if is_returned else random.choice(['borrowed', 'overdue']),
                        'late_fee': Decimal(0) if is_returned else Decimal(random.randint(10000, 50000)),
                    }
                )

    def create_dormitories_and_assignments(self, students, semesters):
        """Create dormitories and assignments"""
        self.stdout.write('Creating dormitories...')

        dormitories = []
        for building in ['A', 'B', 'C', 'D']:
            for room_num in range(101, 121):
                dorm, _ = Dormitory.objects.get_or_create(
                    building=building,
                    room_number=str(room_num),
                    defaults={
                        'room_type': random.choice(['6', '4', '2']),
                        'floor': room_num // 100,
                        'capacity': int(random.choice(['6', '4', '2'])),
                        'current_occupancy': random.randint(0, 6),
                        'price_per_semester': Decimal(random.randint(800000, 2000000)),
                        'amenities': random.sample(['wifi', 'ac', 'bathroom', 'balcony'], random.randint(2, 4)),
                    }
                )
                dormitories.append(dorm)

        # Create assignments
        self.stdout.write('Creating dormitory assignments...')

        current_semester = next((s for s in semesters if s.is_current), semesters[-1])

        for student in students[:3]:
            if random.random() > 0.4:
                dorm = random.choice(dormitories)
                DormitoryAssignment.objects.get_or_create(
                    student=student,
                    semester=current_semester,
                    defaults={
                        'dormitory': dorm,
                        'check_in_date': current_semester.start_date,
                        'status': 'approved',
                    }
                )

    def create_health_insurances(self, students):
        """Create health insurances"""
        self.stdout.write('Creating health insurances...')

        for student in students:
            HealthInsurance.objects.get_or_create(
                student=student,
                defaults={
                    'insurance_number': f'BHYT{student.id:08d}',
                    'issue_date': '2024-09-01',
                    'expiry_date': '2025-08-31',
                    'status': 'active',
                    'hospital_name': 'Bệnh viện Đa khoa Quốc tế',
                }
            )

    def create_contacts(self):
        """Create contacts for departments"""
        self.stdout.write('Creating contacts...')

        contacts_data = [
            {
                'department_type': 'academic',
                'name': 'Phòng Đào tạo',
                'email': 'daotao@university.edu.vn',
                'phone': '0243.123.4567',
                'location': 'Tầng 2, Tòa A1',
                'office_hours': 'Thứ 2 - Thứ 6: 08:00 - 17:00',
            },
            {
                'department_type': 'student',
                'name': 'Phòng Công tác Sinh viên',
                'email': 'ctsv@university.edu.vn',
                'phone': '0243.123.4568',
                'location': 'Tầng 1, Tòa A2',
                'office_hours': 'Thứ 2 - Thứ 6: 08:00 - 17:00',
            },
            {
                'department_type': 'finance',
                'name': 'Phòng Tài chính',
                'email': 'taichinh@university.edu.vn',
                'phone': '0243.123.4569',
                'location': 'Tầng 2, Tòa B1',
                'office_hours': 'Thứ 2 - Thứ 6: 08:00 - 16:30',
            },
            {
                'department_type': 'library',
                'name': 'Thư viện Trường',
                'email': 'thuvien@university.edu.vn',
                'phone': '0243.123.4570',
                'location': 'Tòa C1',
                'office_hours': 'Thứ 2 - Chủ nhật: 07:30 - 21:00',
            },
            {
                'department_type': 'dorm',
                'name': 'Ký túc xá',
                'email': 'ktx@university.edu.vn',
                'phone': '0243.123.4571',
                'location': 'Khu KTX',
                'office_hours': 'Thứ 2 - Thứ 6: 08:00 - 17:00',
            },
            {
                'department_type': 'health',
                'name': 'Trạm Y tế',
                'email': 'yte@university.edu.vn',
                'phone': '0243.123.4572',
                'location': 'Tầng 1, Tòa A3',
                'office_hours': 'Thứ 2 - Thứ 6: 08:00 - 17:00',
            },
            {
                'department_type': 'it',
                'name': 'Phòng Công nghệ Thông tin',
                'email': 'cntt@university.edu.vn',
                'phone': '0243.123.4573',
                'location': 'Tầng 3, Tòa B2',
                'office_hours': 'Thứ 2 - Thứ 6: 08:00 - 17:00',
            },
            {
                'department_type': 'career',
                'name': 'Trung tâm Hỗ trợ Việc làm',
                'email': 'vieclam@university.edu.vn',
                'phone': '0243.123.4574',
                'location': 'Tầng 2, Tòa C2',
                'office_hours': 'Thứ 2 - Thứ 6: 08:30 - 17:30',
            },
        ]

        contacts = []
        for data in contacts_data:
            contact, _ = Contact.objects.get_or_create(
                department_type=data['department_type'],
                name=data['name'],
                defaults=data
            )
            contacts.append(contact)

        return contacts
