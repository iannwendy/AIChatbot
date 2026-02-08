# AI Chatbot - Hệ thống hỗ trợ sinh viên với RAG

Hệ thống web Full-stack tích hợp AI để hỗ trợ sinh viên giải đáp thắc mắc về môn học sử dụng kỹ thuật RAG (Retrieval-Augmented Generation).

## 🛠️ Công nghệ sử dụng

### Frontend
- **ReactJS** với TypeScript
- **Material-UI** cho giao diện
- **React Router** cho routing
- **Axios** cho API calls

### Backend
- **Django** với Django REST Framework
- **MongoDB** cho database chính
- **ChromaDB** cho Vector Database
- **LangChain** cho AI/LLM integration
- **OpenAI API** cho LLM

### Infrastructure
- **Docker** & **Docker Compose** cho containerization

## 📁 Cấu trúc dự án

```
AIChatbot/
├── backend/                 # Django backend
│   ├── apps/               # Django apps
│   │   ├── authentication/  # Xác thực người dùng
│   │   ├── users/            # Quản lý người dùng
│   │   ├── courses/          # Quản lý môn học
│   │   ├── documents/        # Quản lý tài liệu
│   │   └── chat/             # Chat và RAG
│   ├── config/             # Cấu hình Django
│   ├── manage.py
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Các trang
│   │   ├── services/      # API services
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml      # Docker Compose config
└── README.md
```

## 🚀 Cài đặt và chạy dự án

### Yêu cầu
- Docker và Docker Compose
- (Tùy chọn) Python 3.11+ và Node.js 18+ nếu chạy local

### Chạy với Docker (Khuyến nghị)

1. **Clone repository và vào thư mục dự án:**
```bash
cd AIChatbot
```

2. **Tạo file `.env` cho backend:**
```bash
cd backend
cp env.example .env
# Chỉnh sửa .env với các giá trị thực tế của bạn
```

3. **Chạy toàn bộ hệ thống:**
```bash
docker-compose up --build
```

Hệ thống sẽ chạy trên:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- MongoDB: localhost:27017
- ChromaDB: http://localhost:8001

### Chạy local (Development)

#### Backend

1. **Tạo virtual environment:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Trên Windows: venv\Scripts\activate
```

2. **Cài đặt dependencies:**
```bash
pip install -r requirements.txt
```

3. **Chạy migrations:**
```bash
python manage.py migrate
```

4. **Tạo superuser:**
```bash
python manage.py createsuperuser
```

5. **Chạy server:**
```bash
python manage.py runserver
```

#### Frontend

1. **Cài đặt dependencies:**
```bash
cd frontend
npm install
```

2. **Chạy development server:**
```bash
npm start
```

## 📝 Các tính năng đã triển khai

### Cấp độ 1: Cơ bản (Khung sườn)
- ✅ Cấu trúc dự án Full-stack
- ✅ Django backend với REST API
- ✅ React frontend với routing
- ✅ MongoDB database setup
- ✅ ChromaDB vector database setup
- ✅ Docker Compose configuration
- ⏳ Authentication với Google OAuth (placeholder)
- ⏳ Quản lý người dùng, môn học (models đã tạo)
- ⏳ Upload và quản lý tài liệu (models đã tạo)
- ⏳ Giao diện chat cơ bản (UI đã tạo)
- ⏳ Lưu lịch sử chat (models đã tạo)

### Cấp độ 2: RAG Cơ bản (Chưa triển khai)
- ⏳ Xử lý tài liệu (Parsing, Chunking)
- ⏳ Embedding và lưu vào Vector DB
- ⏳ Chat hỏi đáp với RAG
- ⏳ Trích dẫn nguồn

### Cấp độ 3: Nâng cao (Chưa triển khai)
- ⏳ Streaming Response
- ⏳ Quản lý ngữ cảnh hội thoại
- ⏳ Tùy chọn Model

### Cấp độ 4: Chuyên sâu (Chưa triển khai)
- ⏳ Function Calling / Agent
- ⏳ Tạo bài tập trắc nghiệm
- ⏳ Hybrid Search

## 🔧 Cấu hình

### Environment Variables

Tạo file `backend/.env` với các biến sau:

```env
SECRET_KEY=your-secret-key
DEBUG=True

# MongoDB
MONGO_HOST=mongodb://mongodb:27017/
MONGO_DB_NAME=aichatbot
MONGO_USER=
MONGO_PASSWORD=

# Google OAuth
GOOGLE_OAUTH2_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH2_CLIENT_SECRET=your-google-client-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# ChromaDB
CHROMA_DB_PATH=/app/chroma_db
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/google/` - Đăng nhập với Google

### Users
- `GET /api/users/` - Danh sách người dùng
- `GET /api/users/students/` - Danh sách sinh viên
- `GET /api/users/teachers/` - Danh sách giáo viên

### Courses
- `GET /api/courses/` - Danh sách môn học
- `POST /api/courses/` - Tạo môn học mới
- `GET /api/courses/{id}/` - Chi tiết môn học

### Documents
- `GET /api/documents/` - Danh sách tài liệu
- `POST /api/documents/` - Upload tài liệu
- `POST /api/documents/{id}/process/` - Xử lý tài liệu cho RAG

### Chat
- `GET /api/chat/sessions/` - Danh sách phiên chat
- `POST /api/chat/sessions/` - Tạo phiên chat mới
- `POST /api/chat/sessions/{id}/send_message/` - Gửi tin nhắn

## 🧪 Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

## 📄 License

MIT License

## 👥 Contributors

- [Your Name]

## 📞 Liên hệ

Nếu có thắc mắc, vui lòng tạo issue trên GitLab repository.

<!-- Leaving a comment -->