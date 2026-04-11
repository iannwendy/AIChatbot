---

# 📙 README_SYSTEM.md (Tổng thể)

```md
# 📙 AIChatBot – SYSTEM OVERVIEW

## 1. Giới thiệu

AIChatBot là hệ thống hỗ trợ sinh viên:
- Hỏi đáp kiến thức (RAG)
- Hỏi đáp hành chính (Agent)
- Quản lý học tập

---

## 2. Kiến trúc tổng thể

Frontend (React)
↓
Backend (Django API)
↓
Database:

- SQLite (core data)
- MongoDB (chat)
- ChromaDB (vector)

---

## 3. Thành phần chính

### Backend

- API + business logic
- RAG + Agent

### Frontend

- UI/UX
- Chat interface

### Database

- SQL + NoSQL + Vector DB

---

## 4. Luồng chat

1. User gửi câu hỏi
2. Backend phân loại
3. Nếu học thuật → RAG
4. Nếu hành chính → tool-calling
5. Trả lời bằng LLM

---

## 5. Tính năng chính

- Chat AI theo môn học
- Hybrid search (Vector + BM25)
- Quiz system
- Dashboard quản lý
- Streaming realtime

---

## 6. Vai trò người dùng

### Student

- Chat
- Quiz
- Xem tài liệu

### Teacher

- Upload tài liệu
- Quản lý quiz

### Admin

- Quản lý user
- Dashboard

---

## 7. Điểm mạnh

- RAG + Agent kết hợp
- Hybrid search
- Streaming realtime
- Kiến trúc rõ ràng

---

## 8. Hạn chế

- Chưa production-ready
- Auth đơn giản
- Thiếu test

---

## 9. Hướng phát triển

- AI nâng cao
- Realtime WebSocket
- Deploy cloud
- Monitoring

---

## 10. Kết luận

Hệ thống AIChatBot là một nền tảng EdTech hoàn chỉnh, kết hợp:

- AI chatbot
- Quản lý học tập
- Truy vấn dữ liệu thông minh

Có khả năng mở rộng thành sản phẩm thực tế.
