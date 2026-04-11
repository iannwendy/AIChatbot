# AIChatBot - README2 (Super Detailed Project Overview)

Tài liệu này mô tả chi tiết toàn bộ project AIChatBot theo trạng thái source code hiện tại, bao gồm:
- Mục tiêu hệ thống
- Kiến trúc tổng thể và luồng dữ liệu
- Thiết kế backend/frontend
- RAG + Agent + Hybrid Search
- Mô hình dữ liệu
- API map
- Cấu hình môi trường, Docker, vận hành
- Kịch bản sử dụng theo vai trò
- Rủi ro kỹ thuật và hướng cải thiện

---

## 1) Bức tranh tổng quan

AIChatBot là hệ thống hỗ trợ sinh viên theo mô hình Full-stack, kết hợp:
- Quản trị học vụ cơ bản (user, môn học, tài liệu, quiz)
- Chat AI theo ngữ cảnh môn học
- RAG (Retrieval-Augmented Generation) để trả lời dựa trên tài liệu thật
- Agent tool-calling để xử lý thêm các câu hỏi hành chính học vụ

### 1.1 Mục tiêu nghiệp vụ

Hệ thống nhắm tới 2 nhóm nhu cầu chính:
1. Hỏi đáp kiến thức môn học từ tài liệu giảng dạy (slide, PDF, DOCX, TXT)
2. Hỏi đáp thông tin hành chính (học phí, lịch học, lịch thi, thông báo, KTX, thư viện, BHYT...)

### 1.2 Vai trò người dùng

- Student:
  - Chat theo môn học
  - Xem tài liệu môn đã đăng ký
  - Làm quiz do giáo viên tạo
  - Làm practice quiz ngay trong chat
- Teacher:
  - Quản lý lớp/môn được phân công
  - Upload và xử lý tài liệu cho RAG
  - Quản lý quiz và theo dõi tiến độ lớp
- Admin:
  - Quản trị người dùng/môn học
  - Import user từ file
  - Xem dashboard thống kê toàn cục

---

## 2) Công nghệ sử dụng

## 2.1 Backend

- Django 4.2 + Django REST Framework
- CORS middleware
- Social auth (Google OAuth)
- pymongo để thao tác MongoDB
- LangChain + Google Gemini (LLM + embedding)
- ChromaDB làm vector database
- rank-bm25 cho keyword search
- pandas/openpyxl cho import dữ liệu

## 2.2 Frontend

- React + TypeScript (Create React App)
- React Router
- Axios
- Tailwind CSS + MUI
- Markdown + KaTeX rendering cho câu trả lời AI
- SSE stream handling qua fetch + ReadableStream

## 2.3 Hạ tầng

- Docker + Docker Compose
- Services mặc định:
  - frontend: 3000
  - backend: 8000
  - mongodb: 27017
  - chromadb: 8001 (map vào port nội bộ 8000 container chroma)

---

## 3) Kiến trúc tổng thể

## 3.1 Logical Architecture

1. Frontend React gửi request tới Django REST API
2. Django xử lý auth/permission và nghiệp vụ
3. Dữ liệu quan hệ chính chạy trên Django models (SQLite mặc định trong code)
4. Chat session/message đang lưu ở MongoDB (collection-level, không dùng Django model trực tiếp)
5. Tài liệu được parse/chunk/embed và lưu vào ChromaDB
6. Khi chat:
   - Agent quyết định gọi tool nào
   - Nếu hỏi kiến thức: truy xuất tài liệu (Vector + BM25)
   - Nếu hỏi hành chính: truy vấn dữ liệu nghiệp vụ từ DB qua tool function
   - Sau đó tạo câu trả lời tự nhiên bằng LLM

## 3.2 Kiến trúc backend theo app

- apps.authentication: user model mở rộng + OAuth + stats endpoint
- apps.users: quản lý student/teacher/import
- apps.courses: môn học, lịch thi, quiz, quiz attempt/result
- apps.documents: upload và ingestion pipeline cho RAG
- apps.documents.rag: retriever/agent/tools
- apps.chat: chat session + message bằng MongoDB, hỗ trợ SSE streaming
- apps.academic: dữ liệu hành chính mở rộng phục vụ tool-calling

---

## 4) Thiết kế dữ liệu

## 4.1 User và quyền

User kế thừa AbstractUser, bổ sung:
- role: student | teacher | admin
- google_id, avatar_url
- created_at, updated_at

Permission custom:
- AdminRolePermission
- AdminOrTeacherPermission

Ngoài session auth, project có TokenAuthentication dạng đơn giản:
- Header: Authorization: Bearer admin_{user_id}_{timestamp}
- Dùng chủ yếu cho luồng admin dev login

## 4.2 Học phần và quiz

Core entities:
- Course
- ExamSchedule
- Quiz
- Question
- QuizAttempt
- QuizResult

Đặc điểm:
- Student làm quiz qua start/submit flow
- Lưu score, thời gian, per-question result
- Teacher xem class progress theo lớp học (class_group)

## 4.3 Tài liệu và RAG

Document gồm:
- title, file, file_type, course, uploaded_by
- is_processed đánh dấu đã ingest vào vector store

Pipeline ingestion:
1. Parse file thành pages
2. Chunk pages
3. Embedding chunks
4. Lưu vào ChromaDB
5. Cập nhật is_processed

## 4.4 Chat dữ liệu trong MongoDB

Collection chính:
- chat_sessions
- chat_messages

Lưu trữ:
- session theo user + course context
- message user/assistant
- sources trích dẫn
- practice_quiz đính kèm trong assistant message khi agent sinh quiz

## 4.5 Academic (hành chính)

Module academic mô hình hóa sâu dữ liệu đại học:
- AcademicYear, Semester
- Major, StudentClass
- CourseSection, Schedule
- TuitionFee, Scholarship
- Enrollment, AcademicRecord
- Announcement
- StudentIDCard, LibraryRecord
- Dormitory, DormitoryAssignment
- HealthInsurance
- Contact

Mục tiêu: làm nguồn dữ liệu cho agent tool-calling khi câu hỏi không phải kiến thức môn học.

---

## 5) Luồng nghiệp vụ chính

## 5.1 Đăng nhập

### Google OAuth
- Frontend chuyển hướng qua endpoint auth/google
- Backend dựng URL OAuth Google
- Callback đổi code lấy token + profile
- Tự tạo/link user
- Login session và redirect về frontend

### Admin login dev
- Endpoint admin-login hardcoded username/password (admin/pass123)
- Tự đảm bảo quyền admin/is_staff/is_superuser

## 5.2 Quản lý tài liệu và RAG

1. Teacher/Admin upload document vào course
2. Hệ thống auto-process tài liệu ngay sau upload (nếu lỗi vẫn lưu file)
3. Có endpoint process/reprocess thủ công
4. Chunk + embedding vào ChromaDB
5. Chat dùng retriever lấy context để trả lời

## 5.3 Chat thường (non-stream)

1. User gửi message
2. Lưu user message vào MongoDB
3. Tải history gần nhất
4. Gọi RAGAgent.invoke
5. Lưu assistant message
6. Trả response đầy đủ

## 5.4 Chat streaming SSE

1. User gửi message vào endpoint send_message_stream
2. Backend trả event-stream:
   - start
   - chunk (token-by-token)
   - sources
   - done
3. Frontend đọc stream bằng reader.read() và render real-time
4. Nếu agent gọi generate_practice_quiz, backend phát thêm event practice_quiz

## 5.5 Tool-calling Agent

Agent system prompt phân loại câu hỏi:
- Học thuật môn học -> search_documents
- Hành chính -> tool tương ứng (học phí, lịch thi, lịch học, thông báo...)
- Tổng quát -> trả lời trực tiếp

Một số tool tiêu biểu:
- search_documents
- generate_practice_quiz
- get_exam_schedule
- get_my_schedule
- get_tuition_fee
- get_academic_records
- get_announcements
- get_library_records
- get_dormitory_info
- get_health_insurance
- get_contacts
- get_current_semester

## 5.6 Hybrid search

DocumentRetriever hỗ trợ:
- Vector search
- BM25 keyword search
- Reciprocal Rank Fusion (RRF) để trộn kết quả

Mặc định khi có course_id thì ưu tiên hybrid retrieve.

## 5.7 Quiz flow

### Teacher
- Tạo quiz thủ công hoặc generate từ tài liệu
- Thêm/sửa câu hỏi
- Xem all attempts hoặc class-progress

### Student
- Start quiz (tạo attempt)
- Submit answers (lưu quiz_result per question)
- Xem result và lịch sử attempts

---

## 6) Frontend architecture chi tiết

## 6.1 Routing và phân quyền

App.tsx dùng ProtectedRoute + redirect theo role:
- student -> MainLayout
- teacher -> TeacherLayout
- admin -> AdminLayout

Các nhóm route:
- Public: /login, /admin-login
- Student: /chat, /course/:id, /student/quiz/:quizId ...
- Teacher: /teacher/dashboard, /teacher/quizzes ...
- Admin: /admin/dashboard, /admin/users ...

## 6.2 State quản lý auth

AuthContext lưu:
- user
- token (localStorage)
- login/logout/updateUser

Interceptor axios:
- Gắn Bearer token
- Gắn CSRF token cho request thay đổi dữ liệu
- Nếu 401 -> clear localStorage và chuyển về /login

## 6.3 Chat UI

ChatPage hỗ trợ:
- Model selector (Gemini 2.5 Flash/Pro, 2.0 Flash)
- Course banner theo context
- SSE streaming
- Source citation
- Practice quiz inline trong tin nhắn assistant
- Quiz panel riêng trong màn chat

---

## 7) API map tổng hợp

Lưu ý: prefix chung là /api

## 7.1 Authentication

- GET /auth/google/
- GET /auth/google/callback
- POST /auth/admin-login/
- GET /auth/current-user/
- POST /auth/logout/
- PATCH /auth/update-profile/
- GET /auth/admin/stats/
- GET /auth/teacher/stats/

## 7.2 Users

Theo router:
- /users/
- /users/students/
- /users/teachers/
- /users/import/students/
- /users/import/teachers/

Hỗ trợ CRUD users và quản lý student/teacher.

## 7.3 Courses + Quiz

- /courses/
- /courses/{id}/enroll/
- /courses/{id}/unenroll/
- /courses/{id}/import-students/
- /courses/{id}/generate-quiz/
- /courses/{id}/submit-quiz/{quiz_id}/
- /courses/{id}/exam-schedule/
- /courses/my_courses/
- /courses/quizzes/
- /courses/quizzes/{quiz_id}/start/
- /courses/quizzes/{quiz_id}/submit/
- /courses/quizzes/{quiz_id}/result/
- /courses/quizzes/{quiz_id}/class-progress/
- /courses/quizzes/{quiz_id}/all-attempts/

## 7.4 Documents

- /documents/
- /documents/{id}/process/
- /documents/{id}/reprocess/
- /documents/by_course/?course_id=...

## 7.5 Chat

- /chat/sessions/
- /chat/sessions/{id}/
- /chat/sessions/{id}/send_message/
- /chat/sessions/{id}/send_message_stream/
- /chat/sessions/models/
- /chat/sessions/{id}/update_practice_quiz/

## 7.6 Academic

Các router read-only:
- /academic/academic-years/
- /academic/semesters/
- /academic/majors/
- /academic/course-sections/
- /academic/schedules/
- /academic/calendar/
- /academic/tuition-fees/
- /academic/scholarships/
- /academic/enrollments/
- /academic/academic-records/
- /academic/announcements/
- /academic/id-cards/
- /academic/library/
- /academic/dormitories/
- /academic/dormitory-assignments/
- /academic/health-insurance/
- /academic/contacts/

---

## 8) Cấu hình môi trường

## 8.1 Biến môi trường backend quan trọng

- SECRET_KEY
- DEBUG
- MONGO_HOST, MONGO_DB_NAME, MONGO_USER, MONGO_PASSWORD
- GOOGLE_OAUTH2_CLIENT_ID, GOOGLE_OAUTH2_CLIENT_SECRET
- GEMINI_API_KEY (trong settings)
- CHROMA_HOST, CHROMA_PORT, CHROMA_DB_PATH
- LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS
- CHUNK_SIZE, CHUNK_OVERLAP
- RETRIEVAL_TOP_K
- MEMORY_WINDOW_SIZE

Lưu ý đồng bộ:
- File env.example hiện còn ghi OPENAI_API_KEY, trong khi code dùng GEMINI_API_KEY.

## 8.2 Database thực tế

Theo settings.py:
- Django default DB: SQLite (db.sqlite3)
- MongoDB: dùng qua pymongo cho dữ liệu chat
- ChromaDB: vector store

=> Hệ thống đang ở mô hình hybrid 3 kho dữ liệu: SQLite + MongoDB + ChromaDB.

---

## 9) Docker và chạy hệ thống

## 9.1 docker-compose

Services:
- mongodb
- chromadb
- backend
- frontend

Backend command trong compose:
1. migrate
2. collectstatic
3. runserver 0.0.0.0:8000

Frontend:
- npm start trên port 3000
- volume mount source để dev hot-reload

## 9.2 Cách chạy nhanh

1. Tạo file backend/.env từ env.example
2. Bổ sung key OAuth + Gemini
3. Chạy: docker-compose up --build

---

## 10) Test và script hỗ trợ

Các file đáng chú ý:
- create_test_data.py: tạo user/course mẫu
- test_agent.py: test invoke agent với câu hỏi hành chính
- test_quiz_api.py: test luồng quiz logic ở mức script

Lưu ý:
- Project chưa có bộ test tự động toàn diện kiểu CI-ready; hiện chủ yếu script thủ công.

---

## 11) Điểm mạnh hiện tại

1. Kiến trúc khá đầy đủ cho đồ án AI hỗ trợ học tập
2. RAG đã có ingestion + hybrid retrieval + source citation
3. Streaming SSE hoạt động cho trải nghiệm realtime
4. Agent tool-calling đã có nhiều tool hành chính phong phú
5. Quiz có cả teacher management + student attempt + class progress
6. Frontend phân tách route/layout theo role rõ ràng

---

## 12) Các lưu ý kỹ thuật quan trọng

1. Chat app khai báo model Django trong apps.chat.models, nhưng luồng chat runtime đang dùng MongoDB trực tiếp; cần thống nhất chiến lược lưu trữ lâu dài.
2. env.example và settings có khác tên biến Gemini (GEMINI_API_KEY vs nội dung mẫu cũ).
3. TokenAuthentication hiện là token format đơn giản, phù hợp demo/dev hơn production.
4. Một số endpoint/path có khác biệt naming giữa README cũ và router thực tế (ví dụ import-students dùng dấu gạch ngang).
5. ALLOWED_HOSTS = ['*'] và cấu hình CORS/CSRF hiện ưu tiên môi trường dev.

---

## 13) Roadmap đề xuất nâng cấp

1. Chuẩn hóa auth production (JWT/OAuth session cứng hóa, refresh token, rotate token).
2. Thống nhất data storage strategy và migration plan (SQLite vs Mongo cho entity nào).
3. Tách background worker cho ingestion nặng (Celery/Redis đã có dependency, chưa khai thác sâu trong code hiện đọc).
4. Bổ sung automated tests:
   - Unit test cho retriever/tool functions
   - API integration test cho chat streaming
   - E2E test frontend các flow chính
5. Observability:
   - Structured logging
   - Tracing cho chain/tool call
   - Dashboard chất lượng câu trả lời (RAG hit rate)
6. Hardening bảo mật:
   - Secrets management
   - CSRF/CORS policy production
   - Permission audit trên endpoint nhạy cảm

---

## 14) Kết luận

AIChatBot hiện đã vượt mức một chatbot FAQ cơ bản, tiến tới một nền tảng trợ lý học tập có:
- Kiến thức môn học theo tài liệu thật (RAG)
- Truy vấn hành chính thông minh (Agent tool-calling)
- Trải nghiệm chat realtime (SSE)
- Hệ sinh thái quản trị user/course/document/quiz đầy đủ cho bối cảnh trường đại học

Nếu tiếp tục chuẩn hóa bảo mật, test và vận hành production, hệ thống có thể mở rộng tốt cho quy mô lớp/khoa hoặc làm nền cho sản phẩm EdTech nội bộ.
