# 📗 FRONTEND – AIChatBot System

## 1. Giới thiệu

Frontend được xây dựng bằng React + TypeScript, cung cấp giao diện người dùng cho:

- Chat AI
- Quản lý khóa học
- Quiz
- Dashboard

---

## 2. Kiến trúc frontend

- Component-based architecture
- Context API quản lý state
- Service layer gọi API

Luồng:
User → UI → API → Backend → Response → Render

---

## 3. Công nghệ sử dụng

- React + TypeScript
- Axios
- React Router
- Tailwind CSS + MUI
- Markdown + KaTeX
- SSE Streaming

---

## 4. Cấu trúc thư mục

src/
├── components/
├── pages/
├── context/
├── services/
├── utils/

---

## 5. Routing & phân quyền

- Public:
  - /login
- Student:
  - /chat
  - /course/:id
- Teacher:
  - /teacher/dashboard
- Admin:
  - /admin/dashboard

---

## 6. Quản lý state

AuthContext:

- user
- token
- login/logout

Axios interceptor:

- Gắn token
- Handle 401

---

## 7. Chat UI

- Streaming realtime (SSE)
- Model selector (Gemini)
- Hiển thị source
- Practice quiz inline
- Chat theo course context

---

## 8. API integration

Ví dụ:

```ts
axios.post("/api/chat/send_message", data);
```
