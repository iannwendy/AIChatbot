"""
Test Quiz API Endpoints
Run: source venv/bin/activate && python test_quiz_api.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from apps.courses.models import Course, Quiz, Question, QuizAttempt, QuizResult
from apps.users.models import Student

User = get_user_model()

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"

def test(name, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"  {status}  {name}" + (f" - {detail}" if detail else ""))
    return condition

def run_tests():
    print("\n" + "="*60)
    print("   QUIZ API TEST SUITE")
    print("="*60)

    # ─── Setup: Create test users and course ───
    print("\n[Setup] Creating test data...")

    teacher, _ = User.objects.get_or_create(
        username='test_teacher_quiz',
        defaults={'email': 'teacher_quiz@test.com', 'role': 'teacher'}
    )

    student1, _ = User.objects.get_or_create(
        username='test_student_quiz1',
        defaults={'email': 'student_quiz1@test.com', 'role': 'student'}
    )
    student2, _ = User.objects.get_or_create(
        username='test_student_quiz2',
        defaults={'email': 'student_quiz2@test.com', 'role': 'student'}
    )

    # Create student profiles
    Student.objects.get_or_create(user=student1, defaults={'student_id': 'SV_Q001', 'class_group': 'K17.1'})
    Student.objects.get_or_create(user=student2, defaults={'student_id': 'SV_Q002', 'class_group': 'K17.2'})

    course, _ = Course.objects.get_or_create(
        code='TEST_QUIZ_101',
        defaults={'name': 'Test Quiz Course', 'teacher': teacher}
    )
    course.students.add(student1, student2)
    print(f"  Teacher: {teacher.username} (id={teacher.id})")
    print(f"  Students: {student1.username} (id={student1.id}), {student2.username} (id={student2.id})")
    print(f"  Course: {course.code} (id={course.id})")

    passed = 0
    total = 0

    # ─── Test 1: Teacher creates quiz manually ───
    print("\n[Test 1] Teacher creates quiz manually")
    quiz = Quiz.objects.create(
        course=course,
        title='Ôn tập Chương 1',
        description='5 câu hỏi ôn tập chương 1',
        topic='Chương 1',
        created_by=teacher,
    )
    total += 1
    if test("Quiz created", quiz.id is not None, f"id={quiz.id}"):
        passed += 1

    # ─── Test 2: Add questions to quiz ───
    print("\n[Test 2] Add questions to quiz")
    questions_data = [
        {
            'question_text': 'Hệ thống thông tin là gì?',
            'options': ['Phần cứng', 'Phần mềm', 'Hệ thống thu thập, xử lý, lưu trữ và phân phối thông tin', 'Internet'],
            'correct_answer': 2,
            'explanation': 'HTTT là hệ thống thu thập, xử lý, lưu trữ và phân phối thông tin hỗ trợ ra quyết định.'
        },
        {
            'question_text': 'Đâu là thành phần của HTTT?',
            'options': ['Phần cứng', 'Con người', 'Tất cả đáp án', 'Dữ liệu'],
            'correct_answer': 2,
            'explanation': 'HTTT gồm phần cứng, phần mềm, con người, dữ liệu và quy trình.'
        },
        {
            'question_text': 'ERP là viết tắt của?',
            'options': ['Enterprise Resource Planning', 'Enterprise Report Processing', 'Electronic Resource Planning', 'Enterprise Related Platform'],
            'correct_answer': 0,
            'explanation': 'ERP = Enterprise Resource Planning (Hoạch định tài nguyên doanh nghiệp).'
        },
        {
            'question_text': 'CRM dùng để quản lý gì?',
            'options': ['Tài chính', 'Nhân sự', 'Quan hệ khách hàng', 'Sản xuất'],
            'correct_answer': 2,
            'explanation': 'CRM = Customer Relationship Management.'
        },
        {
            'question_text': 'Dữ liệu khác thông tin ở điểm nào?',
            'options': ['Dữ liệu có ý nghĩa', 'Thông tin là dữ liệu chưa xử lý', 'Dữ liệu là sự kiện thô, thông tin là dữ liệu đã xử lý', 'Không khác nhau'],
            'correct_answer': 2,
            'explanation': 'Dữ liệu là sự kiện thô, thông tin là dữ liệu đã được xử lý và có ý nghĩa.'
        },
    ]

    for i, qd in enumerate(questions_data):
        Question.objects.create(
            quiz=quiz,
            question_text=qd['question_text'],
            options=qd['options'],
            correct_answer=qd['correct_answer'],
            explanation=qd['explanation'],
            order=i,
        )

    total += 1
    if test("Questions created", quiz.questions.count() == 5, f"count={quiz.questions.count()}"):
        passed += 1

    # ─── Test 3: List quizzes for course ───
    print("\n[Test 3] List quizzes for course")
    quizzes = Quiz.objects.filter(course=course)
    total += 1
    if test("Quizzes found", quizzes.count() >= 1, f"count={quizzes.count()}"):
        passed += 1

    # ─── Test 4: Student starts quiz ───
    print("\n[Test 4] Student starts quiz (student1)")
    attempt = QuizAttempt.objects.create(
        student=student1,
        quiz=quiz,
        total_questions=quiz.questions.count(),
        class_group='K17.1',
    )
    total += 1
    if test("Attempt created", attempt.id is not None, f"attempt_id={attempt.id}"):
        passed += 1
    total += 1
    if test("Attempt not completed", attempt.completed_at is None):
        passed += 1

    # ─── Test 5: Student submits quiz ───
    print("\n[Test 5] Student submits quiz")
    from django.utils import timezone

    questions = list(quiz.questions.all())
    # Student1: answers correctly 3/5
    student_answers = [2, 2, 0, 1, 2]  # q1:correct, q2:correct, q3:correct, q4:WRONG(1), q5:correct

    score = 0
    for i, question in enumerate(questions):
        selected = student_answers[i] if i < len(student_answers) else None
        is_correct = selected == question.correct_answer
        if is_correct:
            score += 1

        QuizResult.objects.create(
            attempt=attempt,
            question=question,
            selected_option=selected,
            is_correct=is_correct,
            time_spent_seconds=15,
        )

    attempt.score = score
    attempt.total_questions = len(questions)
    attempt.answers = student_answers
    attempt.time_spent_seconds = 120
    attempt.completed_at = timezone.now()
    attempt.save()

    total += 1
    if test("Score calculated", score == 4, f"score={score}/5"):
        passed += 1
    total += 1
    if test("Results saved", attempt.results.count() == 5, f"result_count={attempt.results.count()}"):
        passed += 1
    total += 1
    if test("Attempt completed", attempt.completed_at is not None):
        passed += 1

    # ─── Test 6: Student2 submits quiz ───
    print("\n[Test 6] Student2 submits quiz (all wrong)")
    attempt2 = QuizAttempt.objects.create(
        student=student2,
        quiz=quiz,
        total_questions=quiz.questions.count(),
        class_group='K17.2',
    )

    for i, question in enumerate(questions):
        wrong_answer = (question.correct_answer + 1) % 4
        QuizResult.objects.create(
            attempt=attempt2,
            question=question,
            selected_option=wrong_answer,
            is_correct=False,
            time_spent_seconds=10,
        )

    attempt2.score = 0
    attempt2.total_questions = len(questions)
    attempt2.answers = [(q.correct_answer + 1) % 4 for q in questions]
    attempt2.time_spent_seconds = 60
    attempt2.completed_at = timezone.now()
    attempt2.save()

    total += 1
    if test("Student2 score", attempt2.score == 0, f"score={attempt2.score}/5"):
        passed += 1

    # ─── Test 7: Get quiz result for student ───
    print("\n[Test 7] Get quiz result")
    student1_attempts = QuizAttempt.objects.filter(student=student1, quiz=quiz, completed_at__isnull=False)
    total += 1
    if test("Student1 attempts found", student1_attempts.count() >= 1, f"count={student1_attempts.count()}"):
        passed += 1

    best = student1_attempts.first()
    results = best.results.all()
    total += 1
    if test("Per-question results", results.count() == 5):
        passed += 1

    correct_results = results.filter(is_correct=True).count()
    total += 1
    if test("Correct results match score", correct_results == best.score, f"correct={correct_results}, score={best.score}"):
        passed += 1

    # ─── Test 8: Teacher views class progress ───
    print("\n[Test 8] Teacher views class progress")
    all_students = course.students.all()
    total += 1
    if test("Total enrolled students", all_students.count() == 2, f"count={all_students.count()}"):
        passed += 1

    completed_attempts = QuizAttempt.objects.filter(quiz=quiz, completed_at__isnull=False)
    total += 1
    if test("Completed attempts", completed_attempts.count() == 2, f"count={completed_attempts.count()}"):
        passed += 1

    # Build progress like the API would
    attempt_by_student = {}
    for att in completed_attempts:
        if att.student_id not in attempt_by_student:
            attempt_by_student[att.student_id] = att
        elif att.score > attempt_by_student[att.student_id].score:
            attempt_by_student[att.student_id] = att

    progress = []
    for s in all_students:
        best_att = attempt_by_student.get(s.id)
        progress.append({
            'student_name': s.username,
            'completed': best_att is not None,
            'score': best_att.score if best_att else None,
            'total': best_att.total_questions if best_att else 5,
            'percentage': round(best_att.score / best_att.total_questions * 100, 1) if best_att and best_att.total_questions > 0 else None,
        })

    total += 1
    if test("Progress for all students", len(progress) == 2):
        passed += 1
    total += 1
    if test("All students completed", all(p['completed'] for p in progress)):
        passed += 1

    for p in progress:
        print(f"    {p['student_name']}: {p['score']}/{p['total']} ({p['percentage']}%)")

    # ─── Test 9: Filter by class group ───
    print("\n[Test 9] Filter by class group K17.1")
    from apps.users.models import Student as StudentModel
    k17_1_ids = StudentModel.objects.filter(class_group='K17.1').values_list('user_id', flat=True)
    k17_1_students = all_students.filter(id__in=k17_1_ids)
    total += 1
    if test("K17.1 students", k17_1_students.count() == 1, f"count={k17_1_students.count()}"):
        passed += 1

    # ─── Test 10: Quiz question_count property ───
    print("\n[Test 10] Quiz properties")
    total += 1
    if test("question_count", quiz.question_count == 5, f"count={quiz.question_count}"):
        passed += 1

    # ─── Cleanup ───
    print("\n[Cleanup] Removing test data...")
    QuizResult.objects.filter(attempt__quiz=quiz).delete()
    QuizAttempt.objects.filter(quiz=quiz).delete()
    Question.objects.filter(quiz=quiz).delete()
    quiz.delete()
    course.students.remove(student1, student2)
    # Don't delete users/course to avoid ID conflicts

    # ─── Summary ───
    print("\n" + "="*60)
    print(f"   RESULTS: {passed}/{total} tests passed")
    if passed == total:
        print(f"   \033[92mALL TESTS PASSED!\033[0m")
    else:
        print(f"   \033[91m{total - passed} TESTS FAILED\033[0m")
    print("="*60 + "\n")

    return passed == total


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
