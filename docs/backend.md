# 📘 BACKEND – AIChatBot System

## 1. Giới thiệu

Backend của AIChatBot được xây dựng bằng Django + Django REST Framework, đóng vai trò:

- Cung cấp RESTful API
- Xử lý logic nghiệp vụ
- Tích hợp AI (RAG + Agent)
- Quản lý dữ liệu học vụ

---

## 2. Kiến trúc backend

Backend được thiết kế theo mô hình:

- RESTful API
- Modular Django Apps
- Hybrid Database:
  - SQLite (dữ liệu chính)
  - MongoDB (chat)
  - ChromaDB (vector)

Luồng:
Frontend → API → Business Logic → Database → Response

---

## 3. Công nghệ sử dụng

- Django 4.2
- Django REST Framework
- MongoDB (pymongo)
- LangChain + Google Gemini
- ChromaDB (vector store)
- rank-bm25 (keyword search)
- pandas, openpyxl

---

## 4. Cấu trúc module

### 4.1 authentication

- Login (Google OAuth + admin dev)
- Token-based authentication
- User profile

### 4.2 users

- Quản lý student/teacher
- Import từ file

### 4.3 courses

- Course, exam schedule
- Quiz, question, attempt, result

### 4.4 documents

- Upload tài liệu
- Xử lý RAG pipeline

### 4.5 chat

- Lưu session/message bằng MongoDB
- Hỗ trợ SSE streaming

### 4.6 academic

- Dữ liệu hành chính (học phí, lịch học, KTX...)

---

## 5. RAG + Agent

### 5.1 RAG pipeline

1. Upload document
2. Chunk dữ liệu
3. Embedding
4. Lưu vào ChromaDB
5. Retrieve khi chat

### 5.2 Hybrid Search

- Vector search
- BM25 keyword search
- RRF (kết hợp kết quả)

### 5.3 Agent Tool-calling

Agent phân loại câu hỏi:

- Học thuật → search_documents
- Hành chính → gọi tool
- Tổng quát → trả lời trực tiếp

Tool tiêu biểu:

- get_exam_schedule
- get_tuition_fee
- get_academic_records
- get_announcements
- generate_practice_quiz

---

## 6. Thiết kế dữ liệu

### SQL (Django)

- User
- Course
- Quiz
- Document

### MongoDB

- chat_sessions
- chat_messages

### ChromaDB

- Vector embedding của tài liệu

---

## 7. API chính

### Auth

- POST /api/auth/login
- GET /api/auth/current-user

### Courses

- GET /api/courses
- POST /api/courses

### Chat

- POST /api/chat/send_message
- POST /api/chat/send_message_stream

### Documents

- POST /api/documents
- POST /api/documents/{id}/process

---

## 8. Chat flow

1. User gửi message
2. Lưu MongoDB
3. Retrieve context (RAG)
4. Agent xử lý
5. Trả response (stream hoặc full)

---

## 9. Bảo mật

- Token Authentication
- Role-based permission
- CORS + CSRF config (dev mode)

---

## 10. Điểm mạnh

- Hybrid database
- RAG + Agent kết hợp
- Streaming realtime
- Modular design

---

## 11. Hạn chế

- Token auth đơn giản (chưa production-ready)
- Chưa có test automation đầy đủ

---

## 12. Hướng phát triển

- JWT + refresh token
- Redis + Celery
- Logging + monitoring
- Production deployment
