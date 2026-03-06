#!/usr/bin/env python
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Create a test teacher
teacher, created = User.objects.get_or_create(
    email='teacher@test.com',
    defaults={
        'username': 'teacher',
        'role': 'teacher',
        'first_name': 'Test',
        'last_name': 'Teacher'
    }
)
print(f'Teacher: {teacher.email}, created: {created}')

# Create a test student  
student, created = User.objects.get_or_create(
    email='student@test.com',
    defaults={
        'username': 'student',
        'role': 'student',
        'first_name': 'Test',
        'last_name': 'Student'
    }
)
print(f'Student: {student.email}, created: {created}')

# Create a test course
from apps.courses.models import Course
course, created = Course.objects.get_or_create(
    name='Test Course 101',
    defaults={
        'description': 'A test course',
        'teacher': teacher
    }
)
print(f'Course: {course.name}, created: {created}')

# Enroll student in course
course.students.add(student)
print(f'Student enrolled in course')


# #!/usr/bin/env python
# import os
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# import django
# django.setup()

# from django.contrib.auth import get_user_model
# from apps.courses.models import Course

# User = get_user_model()

# print("Creating users...")

# # Teachers
# teachers = []
# for i in range(1, 4):
#     teacher, created = User.objects.get_or_create(
#         email=f'teacher{i}@test.com',
#         defaults={
#             'username': f'teacher{i}',
#             'role': 'teacher',
#             'first_name': 'Teacher',
#             'last_name': str(i)
#         }
#     )

#     teacher.set_password("123456")
#     teacher.save()

#     teachers.append(teacher)
#     print(f'Teacher {teacher.email} created: {created}')

# # Students
# students = []
# for i in range(1, 6):
#     student, created = User.objects.get_or_create(
#         email=f'student{i}@test.com',
#         defaults={
#             'username': f'student{i}',
#             'role': 'student',
#             'first_name': 'Student',
#             'last_name': str(i)
#         }
#     )

#     student.set_password("123456")
#     student.save()

#     students.append(student)
#     print(f'Student {student.email} created: {created}')

# print("Creating courses...")

# courses = []
# for i in range(1, 4):
#     course, created = Course.objects.get_or_create(
#         name=f'Test Course {i}',
#         defaults={
#             'description': f'Description for course {i}',
#             'teacher': teachers[i % len(teachers)]
#         }
#     )

#     courses.append(course)
#     print(f'Course {course.name} created: {created}')

# print("Enrolling students...")

# for course in courses:
#     for student in students:
#         course.students.add(student)

# print("Data creation completed!")

