# AI Chatbot - Student Support System with RAG

A Full-stack web application integrated with AI to help students answer questions about specific subjects using RAG (Retrieval-Augmented Generation) technology.

## Technologies Used

### Frontend

- ReactJS with TypeScript
- Material-UI for UI components
- React Router for routing
- Axios for API calls

### Backend

- Django with Django REST Framework
- MongoDB for main database
- ChromaDB for Vector Database
- LangChain for AI/LLM integration
- Google Gemini API for LLM and Embedding
- rank_bm25 for keyword search

### Infrastructure

- Docker and Docker Compose for containerization

## Project Structure

```
AIChatbot/
├── backend/                 # Django backend
│   ├── apps/               # Django apps
│   │   ├── authentication/  # User authentication
│   │   ├── users/           # User management
│   │   ├── courses/         # Course management
│   │   ├── documents/       # Document management
│   │   └── chat/            # Chat and RAG
│   ├── config/             # Django configuration
│   ├── manage.py
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Pages
│   │   ├── services/       # API services
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml      # Docker Compose config
└── README.md
```

## Installation and Setup

### Requirements

- Docker and Docker Compose
- (Optional) Python 3.11+ and Node.js 18+ for local development

### Running with Docker (Recommended)

1. Clone repository and navigate to project directory:

```bash
cd AIChatbot
```

2. Create `.env` file for backend:

```bash
cd backend
cp env.example .env
# Edit .env with your actual values
```

3. Run the entire system:

```bash
docker-compose up --build
```

The system will run on:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- MongoDB: localhost:27017
- ChromaDB: http://localhost:8001

### Running Locally (Development)

#### Backend

1. Create virtual environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run migrations:

```bash
python manage.py migrate
```

4. Create superuser:

```bash
python manage.py createsuperuser
```

5. Run server:

```bash
python manage.py runserver
```

#### Frontend

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Run development server:

```bash
npm start
```

## Implemented Features

### Level 1: Basic (Foundation)

- Full-stack project structure
- Django backend with REST API
- React frontend with routing
- MongoDB database setup
- ChromaDB vector database setup
- Docker Compose configuration
- Google OAuth authentication
- User and course management
- Document upload and management
- Basic chat interface
- Chat history storage
- Admin dashboard with stats
- Role-based access control (student/teacher/admin)
- User import from Excel

### Level 2: Basic RAG

- Document processing (Parsing PDF, DOCX, TXT)
- Text chunking with RecursiveCharacterTextSplitter
- Embedding with Google Gemini embedding-001
- Storage in ChromaDB vector database
- RAG-based Q&A chat
- Source citation with metadata
- BM25 keyword search
- Hybrid search (vector + BM25 via Reciprocal Rank Fusion)

### Level 3: Advanced

- Streaming Response (SSE real-time token-by-token)
- Conversation context management (memory window)
- Model selection (Gemini 2.0 Flash, 2.5 Flash, 2.5 Pro)
- Admin stats dashboard
- Teacher stats dashboard

### Level 4: Advanced & Agent

- RAG Agent with tool calling (implemented, partially wired)
- Quiz generator (LLM-powered from course documents)
- Quiz submission and scoring with explanations
- Exam schedule management
- Hybrid Search (vector + BM25)

## Configuration

### Environment Variables

Create `backend/.env` file with the following variables:

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

# Google Gemini
GOOGLE_API_KEY=your-google-api-key

# ChromaDB
CHROMA_DB_PATH=/app/chroma_db
```

## API Endpoints

### Authentication

- POST /api/auth/google/ - Login with Google
- POST /api/auth/admin-login/ - Admin login (dev)
- GET /api/auth/current-user/ - Get current user
- POST /api/auth/logout/ - Logout
- PUT /api/auth/update-profile/ - Update user profile

### Admin Stats

- GET /api/auth/admin/stats/ - Admin dashboard stats
- GET /api/auth/teacher/stats/ - Teacher dashboard stats

### Users

- GET /api/users/ - List users
- GET /api/users/students/ - List students
- GET /api/users/teachers/ - List teachers
- POST /api/users/import/ - Import users from Excel

### Courses

- GET /api/courses/ - List courses
- POST /api/courses/ - Create new course
- GET /api/courses/{id}/ - Course details
- PUT /api/courses/{id}/ - Update course
- DELETE /api/courses/{id}/ - Delete course
- POST /api/courses/{id}/enroll/ - Enroll students
- POST /api/courses/{id}/unenroll/ - Unenroll students
- POST /api/courses/{id}/import_students/ - Import students to course
- POST /api/courses/{id}/generate_quiz/ - Generate quiz from course documents
- POST /api/courses/{id}/submit_quiz/ - Submit quiz answers
- GET /api/courses/{id}/exam_schedule/ - Get exam schedules
- POST /api/courses/{id}/exam_schedule/ - Create exam schedule

### Documents

- GET /api/documents/ - List documents
- POST /api/documents/ - Upload document
- GET /api/documents/{id}/ - Document details
- DELETE /api/documents/{id}/ - Delete document
- POST /api/documents/{id}/process/ - Process document for RAG
- POST /api/documents/{id}/reprocess/ - Reprocess document
- GET /api/documents/by_course/{course_id}/ - Documents by course

### Chat

- GET /api/chat/sessions/ - List chat sessions
- POST /api/chat/sessions/ - Create new chat session
- GET /api/chat/sessions/{id}/ - Get chat session
- DELETE /api/chat/sessions/{id}/ - Delete chat session
- POST /api/chat/sessions/{id}/send_message/ - Send message (non-streaming)
- POST /api/chat/sessions/{id}/send_message_stream/ - Send message (streaming SSE)
- GET /api/chat/models/ - List available LLM models

## Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

## License

MIT License

## Contributors

- Your Name

## Contact

If you have any questions, please create an issue on the GitHub or GitLab repository.
<!--Comment>
<!--Comment>
<!--Comment>
<!--Comment>
<!--Comment>
