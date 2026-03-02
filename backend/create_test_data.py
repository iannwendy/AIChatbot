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

