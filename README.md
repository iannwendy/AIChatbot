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
- OpenAI API for LLM

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
- Google OAuth authentication (placeholder)
- User and course management (models created)
- Document upload and management (models created)
- Basic chat interface (UI created)
- Chat history storage (models created)

### Level 2: Basic RAG (Not Implemented)

- Document processing (Parsing, Chunking)
- Embedding and storage in Vector DB
- RAG-based Q&A chat
- Source citation

### Level 3: Advanced (Not Implemented)

- Streaming Response
- Conversation context management
- Model selection

### Level 4: Advanced & Agent (Not Implemented)

- Function Calling / Agent
- Quiz generator
- Hybrid Search

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

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# ChromaDB
CHROMA_DB_PATH=/app/chroma_db
```

## API Endpoints

### Authentication

- POST /api/auth/google/ - Login with Google

### Users

- GET /api/users/ - List users
- GET /api/users/students/ - List students
- GET /api/users/teachers/ - List teachers

### Courses

- GET /api/courses/ - List courses
- POST /api/courses/ - Create new course
- GET /api/courses/{id}/ - Course details

### Documents

- GET /api/documents/ - List documents
- POST /api/documents/ - Upload document
- POST /api/documents/{id}/process/ - Process document for RAG

### Chat

- GET /api/chat/sessions/ - List chat sessions
- POST /api/chat/sessions/ - Create new chat session
- POST /api/chat/sessions/{id}/send_message/ - Send message

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
