"""
Models hành chính đại học - Administrative Database Models.

Bao gồm tất cả bảng dữ liệu phục vụ tra cứu hành chính cho sinh viên:
- Năm học, Học kỳ
- Ngành học, Lớp sinh viên
- Phòng học, Lịch học, Lịch thi
- Học phí, Học bổng
- Đăng ký môn, Bảng điểm
- Thông báo
- Thẻ sinh viên, Thư viện
- Ký túc xá
- Bảo hiểm y tế, Chứng chỉ
- Danh bạ phòng ban
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


# ============================================================
# 1. NĂM HỌC & HỌC KỲ
# ============================================================

class AcademicYear(models.Model):
    """Năm học (ví dụ: 2024-2025)"""
    year = models.CharField(max_length=9)  # e.g., "2024-2025"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        db_table = 'academic_years'
        ordering = ['-year']

    def __str__(self):
        return self.year


class Semester(models.Model):
    """Học kỳ trong năm học"""
    SEMESTER_CHOICES = [
        (1, 'Học kỳ 1'),
        (2, 'Học kỳ 2'),
        (3, 'Học kỳ hè'),
    ]

    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='semesters')
    semester = models.IntegerField(choices=SEMESTER_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    registration_start = models.DateField(null=True, blank=True)
    registration_end = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        db_table = 'semesters'
        ordering = ['academic_year', 'semester']
        unique_together = ['academic_year', 'semester']

    def __str__(self):
        return f"{self.academic_year.year} - HK{self.semester}"


# ============================================================
# 2. NGÀNH HỌC & LỚP SINH VIÊN
# ============================================================

class Major(models.Model):
    """Ngành học"""
    code = models.CharField(max_length=20, unique=True)  # e.g., "CS", "IT"
    name = models.CharField(max_length=200)  # e.g., "Khoa học Máy tính"
    name_en = models.CharField(max_length=200, blank=True)
    faculty = models.CharField(max_length=200)  # Khoa/Viện
    duration_years = models.PositiveIntegerField(default=4)
    total_credits_required = models.PositiveIntegerField(default=130)

    class Meta:
        db_table = 'majors'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class StudentClass(models.Model):
    """Lớp sinh viên (lớp hành chính)"""
    name = models.CharField(max_length=50)  # e.g., "CNTT2024-01"
    major = models.ForeignKey(Major, on_delete=models.CASCADE, related_name='classes')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='classes')
    advisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='advised_classes')
    students = models.ManyToManyField(User, related_name='student_classes', blank=True)

    class Meta:
        db_table = 'student_classes'
        ordering = ['-academic_year', 'name']

    def __str__(self):
        return self.name


# ============================================================
# 3. PHÒNG HỌC
# ============================================================

class Room(models.Model):
    """Phòng học"""
    ROOM_TYPES = [
        ('lecture', 'Phòng giảng'),
        ('lab', 'Phòng lab'),
        ('seminar', 'Phòng seminar'),
        ('exam', 'Phòng thi'),
    ]

    building = models.CharField(max_length=100)  # e.g., "A1", "B2"
    room_number = models.CharField(max_length=20)  # e.g., "101"
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES)
    capacity = models.PositiveIntegerField(default=0)
    equipment = models.JSONField(default=list, blank=True)  # e.g., ["projector", "ac"]

    class Meta:
        db_table = 'rooms'
        ordering = ['building', 'room_number']

    def __str__(self):
        return f"{self.building}-{self.room_number}"


# ============================================================
# 4. LỚP HỌC PHẦN & THỜI KHÓA BIỂU
# ============================================================

class CourseSection(models.Model):
    """Lớp học phần (ví dụ: CS101-01, CS101-02)"""
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='sections')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='course_sections')
    section_number = models.CharField(max_length=10)  # e.g., "01", "02"
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teaching_sections')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    max_students = models.PositiveIntegerField(default=50)
    enrolled_count = models.PositiveIntegerField(default=0)
    credits = models.PositiveIntegerField(default=3)

    class Meta:
        db_table = 'course_sections'
        ordering = ['course', 'section_number']
        unique_together = ['course', 'semester', 'section_number']

    def __str__(self):
        return f"{self.course.code}-{self.section_number} ({self.semester})"


class Schedule(models.Model):
    """Thời khóa biểu chi tiết"""
    DAY_CHOICES = [
        (2, 'Thứ 2'),
        (3, 'Thứ 3'),
        (4, 'Thứ 4'),
        (5, 'Thứ 5'),
        (6, 'Thứ 6'),
        (7, 'Thứ 7'),
        (8, 'Chủ nhật'),
    ]

    course_section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name='schedules')
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_period = models.PositiveIntegerField()  # Tiết bắt đầu (1-15)
    end_period = models.PositiveIntegerField()    # Tiết kết thúc
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'schedules'
        ordering = ['day_of_week', 'start_period']

    def __str__(self):
        return f"{self.course_section} - Thứ {self.day_of_week} tiết {self.start_period}-{self.end_period}"


# ============================================================
# 5. LỊCH HỌC NĂM - SỰ KIỆN HỌC THUẬT
# ============================================================

class AcademicCalendar(models.Model):
    """Lịch học năm - nghỉ lễ, lịch thi, đăng ký, etc."""
    CALENDAR_TYPES = [
        ('holiday', 'Nghỉ lễ'),
        ('exam_period', 'Kỳ thi'),
        ('registration', 'Đăng ký môn'),
        ('graduation', 'Tốt nghiệp'),
        ('orientation', 'Tuần sinh hoạt'),
        ('break', 'Nghỉ'),
        ('other', 'Khác'),
    ]

    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='calendar_events')
    event_type = models.CharField(max_length=20, choices=CALENDAR_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'academic_calendar'
        ordering = ['start_date']

    def __str__(self):
        return f"{self.title} ({self.start_date})"


# ============================================================
# 6. HỌC PHÍ
# ============================================================

class TuitionFee(models.Model):
    """Học phí sinh viên"""
    PAYMENT_STATUS = [
        ('pending', 'Chờ thanh toán'),
        ('paid', 'Đã thanh toán'),
        ('overdue', 'Quá hạn'),
        ('exempted', 'Miễn giảm'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tuition_fees')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='tuition_fees')
    amount = models.DecimalField(max_digits=12, decimal_places=0)  # VND
    discount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    due_date = models.DateField()
    payment_date = models.DateField(null=True, blank=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    payment_method = models.CharField(max_length=50, blank=True)  # Chuyển khoản, tiền mặt
    transaction_id = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'tuition_fees'
        ordering = ['-semester', '-due_date']

    def __str__(self):
        return f"{self.student.username} - {self.semester} - {self.amount:,.0f}đ"


# ============================================================
# 7. HỌC BỔNG
# ============================================================

class Scholarship(models.Model):
    """Học bổng"""
    SCHOLARSHIP_TYPES = [
        ('merit', 'Học bổng khuyến khích học tập'),
        ('talent', 'Học bổng tài năng'),
        ('sports', 'Học bổng thể thao'),
        ('research', 'Học bổng nghiên cứu'),
        ('government', 'Học bổng chính phủ'),
        ('corporate', 'Học bổng doanh nghiệp'),
        ('other', 'Khác'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scholarships')
    scholarship_type = models.CharField(max_length=20, choices=SCHOLARSHIP_TYPES)
    name = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='scholarships')
    awarded_date = models.DateField()
    conditions = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'scholarships'
        ordering = ['-semester', '-awarded_date']

    def __str__(self):
        return f"{self.student.username} - {self.name}"


# ============================================================
# 8. ĐĂNG KÝ HỌC PHẦN & ĐIỂM
# ============================================================

class Enrollment(models.Model):
    """Đăng ký học phần"""
    ENROLLMENT_STATUS = [
        ('registered', 'Đã đăng ký'),
        ('approved', 'Đã duyệt'),
        ('dropped', 'Đã hủy'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course_section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name='enrollments')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=ENROLLMENT_STATUS, default='registered')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    midterm_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    final_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    total_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=5, blank=True)  # A, B+, B, C+, C, D+, D, F

    class Meta:
        db_table = 'enrollments'
        ordering = ['-semester', '-enrolled_at']
        unique_together = ['student', 'course_section']

    def __str__(self):
        return f"{self.student.username} - {self.course_section}"


class AcademicRecord(models.Model):
    """Bảng điểm tổng hợp theo kỳ"""
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='academic_records')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='academic_records')
    gpa = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    total_credits = models.PositiveIntegerField(default=0)
    earned_credits = models.PositiveIntegerField(default=0)
    cumulative_gpa = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    cumulative_credits = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'academic_records'
        ordering = ['-semester']
        unique_together = ['student', 'semester']

    def __str__(self):
        return f"{self.student.username} - {self.semester} - GPA: {self.gpa}"


# ============================================================
# 9. TRẠNG THÁI SINH VIÊN
# ============================================================

class StudentStatus(models.Model):
    """Trạng thái sinh viên"""
    STATUS_CHOICES = [
        ('active', 'Đang học'),
        ('suspended', 'Tạm dừng'),
        ('withdrawn', 'Thôi học'),
        ('graduated', 'Tốt nghiệp'),
        ('expelled', 'Bị đuổi học'),
        ('deferred', 'Bảo lưu'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_statuses')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='student_statuses')
    effective_date = models.DateField()
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'student_statuses'
        ordering = ['-effective_date']

    def __str__(self):
        return f"{self.student.username} - {self.get_status_display()}"


# ============================================================
# 10. THÔNG BÁO HÀNH CHÍNH
# ============================================================

class Announcement(models.Model):
    """Thông báo hành chính"""
    PRIORITY_CHOICES = [
        ('urgent', 'Khẩn'),
        ('high', 'Cao'),
        ('normal', 'Bình thường'),
        ('low', 'Thấp'),
    ]

    CATEGORY_CHOICES = [
        ('academic', 'Học vụ'),
        ('exam', 'Thi'),
        ('tuition', 'Học phí'),
        ('scholarship', 'Học bổng'),
        ('registration', 'Đăng ký'),
        ('event', 'Sự kiện'),
        ('facility', 'Cơ sở vật chất'),
        ('admin', 'Hành chính'),
        ('other', 'Khác'),
    ]

    title = models.CharField(max_length=300)
    content = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    publish_date = models.DateTimeField()
    expiry_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    target_majors = models.ManyToManyField(Major, blank=True, related_name='announcements')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-publish_date']

    def __str__(self):
        return self.title


# ============================================================
# 11. THẺ SINH VIÊN
# ============================================================

class StudentIDCard(models.Model):
    """Thẻ sinh viên"""
    CARD_STATUS = [
        ('active', 'Hoạt động'),
        ('expired', 'Hết hạn'),
        ('lost', 'Mất'),
        ('frozen', 'Khóa'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='id_cards')
    card_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateField()
    expiry_date = models.DateField()
    status = models.CharField(max_length=20, choices=CARD_STATUS, default='active')

    class Meta:
        db_table = 'student_id_cards'
        ordering = ['-issue_date']

    def __str__(self):
        return f"{self.student.username} - {self.card_number}"


# ============================================================
# 12. THƯ VIỆN - MƯỢN SÁCH
# ============================================================

class LibraryRecord(models.Model):
    """Thư viện - lịch sử mượn sách"""
    RECORD_STATUS = [
        ('borrowed', 'Đang mượn'),
        ('returned', 'Đã trả'),
        ('overdue', 'Quá hạn'),
        ('lost', 'Mất'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='library_records')
    book_title = models.CharField(max_length=300)
    book_author = models.CharField(max_length=200, blank=True)
    isbn = models.CharField(max_length=20, blank=True)
    borrow_date = models.DateField()
    due_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=RECORD_STATUS, default='borrowed')
    late_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)

    class Meta:
        db_table = 'library_records'
        ordering = ['-borrow_date']

    def __str__(self):
        return f"{self.student.username} - {self.book_title}"


# ============================================================
# 13. KÝ TÚC XÁ
# ============================================================

class Dormitory(models.Model):
    """Phòng ký túc xá"""
    BUILDING_CHOICES = [
        ('A', 'Tòa A'),
        ('B', 'Tòa B'),
        ('C', 'Tòa C'),
        ('D', 'Tòa D'),
    ]

    ROOM_TYPES = [
        ('6', 'Phòng 6 người'),
        ('4', 'Phòng 4 người'),
        ('2', 'Phòng 2 người'),
    ]

    building = models.CharField(max_length=5, choices=BUILDING_CHOICES)
    room_number = models.CharField(max_length=20)
    room_type = models.CharField(max_length=5, choices=ROOM_TYPES)
    floor = models.PositiveIntegerField()
    capacity = models.PositiveIntegerField()
    current_occupancy = models.PositiveIntegerField(default=0)
    price_per_semester = models.DecimalField(max_digits=12, decimal_places=0)
    amenities = models.JSONField(default=list, blank=True)  # e.g., ["wifi", "ac"]

    class Meta:
        db_table = 'dormitories'
        ordering = ['building', 'room_number']

    def __str__(self):
        return f"Tòa {self.building} - Phòng {self.room_number}"


class DormitoryAssignment(models.Model):
    """Phân bổ phòng KTX cho sinh viên"""
    ASSIGNMENT_STATUS = [
        ('pending', 'Chờ duyệt'),
        ('approved', 'Đã duyệt'),
        ('rejected', 'Từ chối'),
        ('checked_out', 'Đã trả phòng'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dormitory_assignments')
    dormitory = models.ForeignKey(Dormitory, on_delete=models.CASCADE, related_name='assignments')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='dormitory_assignments')
    check_in_date = models.DateField()
    check_out_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=ASSIGNMENT_STATUS, default='pending')
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'dormitory_assignments'
        ordering = ['-semester', '-check_in_date']

    def __str__(self):
        return f"{self.student.username} - {self.dormitory}"


# ============================================================
# 14. BẢO HIỂM Y TẾ
# ============================================================

class HealthInsurance(models.Model):
    """Bảo hiểm y tế sinh viên"""
    INSURANCE_STATUS = [
        ('active', 'Còn hiệu lực'),
        ('expired', 'Hết hạn'),
        ('pending', 'Chờ cấp'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_insurances')
    insurance_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateField()
    expiry_date = models.DateField()
    status = models.CharField(max_length=20, choices=INSURANCE_STATUS, default='active')
    hospital_name = models.CharField(max_length=200, blank=True)
    provider = models.CharField(max_length=200, default='Bảo hiểm xã hội Việt Nam')

    class Meta:
        db_table = 'health_insurances'
        ordering = ['-expiry_date']

    def __str__(self):
        return f"{self.student.username} - {self.insurance_number}"


# ============================================================
# 15. DANH BẠ PHÒNG BAN
# ============================================================

class Contact(models.Model):
    """Danh bạ hành chính - thông tin liên hệ phòng ban"""
    DEPARTMENT_TYPES = [
        ('academic', 'Phòng Đào tạo'),
        ('student', 'Phòng Công tác Sinh viên'),
        ('finance', 'Phòng Tài chính'),
        ('it', 'Phòng Công nghệ Thông tin'),
        ('library', 'Thư viện'),
        ('dorm', 'Ký túc xá'),
        ('health', 'Y tế'),
        ('security', 'Bảo vệ'),
        ('career', 'Trung tâm Hỗ trợ Việc làm'),
        ('other', 'Khác'),
    ]

    department_type = models.CharField(max_length=20, choices=DEPARTMENT_TYPES)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=200, blank=True)
    office_hours = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'contacts'
        ordering = ['department_type', 'name']

    def __str__(self):
        return f"{self.get_department_type_display()} - {self.name}"
