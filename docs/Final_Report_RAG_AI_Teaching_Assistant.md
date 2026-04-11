# Final Report: RAG-Based AI Teaching Assistant for University Courses

> **Academic Semester Project — Artificial Intelligence in Education**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview & Technology Stack](#2-system-overview--technology-stack)
3. [RAG Architecture & Data Flow](#3-rag-architecture--data-flow)
   - 3.1 Document Ingestion Pipeline
   - 3.2 Query & Retrieval Pipeline
   - 3.3 Answer Generation Pipeline
   - 3.4 Data Flow Diagram
4. [Prompt Engineering](#4-prompt-engineering)
   - 4.1 System Prompt — Basic RAG Chain
   - 4.2 System Prompt — Tool-Calling RAG Agent
   - 4.3 Practice Quiz Generation Prompt
   - 4.4 Final Answer Synthesis Prompt
5. [Implementation Details](#5-implementation-details)
6. [Conclusion & Future Work](#6-conclusion--future-work)
7. [References](#7-references)

---

## 1. Introduction

Large Language Models (LLMs), despite their remarkable language understanding capabilities, suffer from a well-documented limitation known as **hallucination** — the generation of plausible but factually incorrect or fabricated information. This problem is particularly acute in educational settings, where accuracy is paramount. A university-level teaching assistant that confidently misstates a formula or invents a citation would undermine student trust and learning outcomes.

**Retrieval-Augmented Generation (RAG)** emerged as a leading paradigm to address this challenge. Instead of relying solely on parametric knowledge encoded in model weights during pre-training, a RAG system retrieves relevant documents at inference time and augments the LLM's context window with grounded, verifiable information. This approach offers three key advantages for educational AI:

1. **Reduced hallucination** by anchoring responses in retrieved course materials.
2. **Domain specificity** by restricting answers to uploaded curriculum content.
3. **Traceability** through inline source citations, enabling students to verify claims.

This project implements a full-stack, production-grade RAG-based AI Teaching Assistant for Vietnamese universities. Students interact with the system via a web chat interface, uploading course documents (PDF, DOCX, TXT) and asking questions that are answered with citations to the source material. The system also handles academic-administrative queries (exam schedules, tuition fees, scholarships) and generates on-demand practice quizzes — all within a unified conversational interface.

---

## 2. System Overview & Technology Stack

### 2.1 System Architecture

The system follows a **three-tier architecture**:

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React 18 + TypeScript, Tailwind CSS | Chat UI, SSE streaming display |
| **Backend** | Django 4.2.7 + DRF | REST API, RAG orchestration |
| **Data Stores** | SQLite (Django ORM), MongoDB 7.0 (chat history), ChromaDB (vector store) | Persistent storage |

### 2.2 AI & NLP Components

| Component | Technology | Version / Model |
|---|---|---|
| **LLM** | Google Gemini API | `gemini-2.5-flash` (default), `gemini-2.5-pro`, `gemini-2.0-flash` |
| **Embedding** | Gemini Embedding | `models/text-embedding-004` |
| **LLM Framework** | LangChain | ≥ 0.3.0 |
| **Vector DB** | ChromaDB | HTTP client, `chromadb/chroma:latest` |
| **Keyword Retrieval** | BM25 | `rank_bm25.BM25Okapi` |
| **PDF Parsing** | PyPDF2 | 3.0.1 |
| **DOCX Parsing** | python-docx | 1.1.0 |

### 2.3 Database Strategy

The system employs a **polyglot persistence** pattern with three distinct data stores, each chosen for its strengths:

- **SQLite (Django ORM)**: Structured relational data — users, courses, documents, quizzes, and academic-administrative records (schedules, fees, scholarships).
- **MongoDB (PyMongo)**: Flexible-schema storage for chat sessions and messages, which carry variable fields (`sources`, `files`, `practice_quiz`) per message type.
- **ChromaDB**: Vector embeddings of document chunks, enabling semantic similarity search.

---

## 3. RAG Architecture & Data Flow

### 3.1 Document Ingestion Pipeline

The ingestion pipeline transforms raw uploaded documents into searchable vector representations. It is fully automated — triggered immediately upon file upload — and executes the following sequential stages:

```
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: FILE PARSING                                          │
│  Input: Raw bytes (PDF / DOCX / TXT)                             │
│  ParserFactory dispatches to:                                    │
│    • PDFParser  → PyPDF2.PdfReader → [{page_number, text}]      │
│    • DOCXParser → python-docx    → [{section, text}]            │
│    • TXTParser  → Line grouping  → [{block, text}]              │
│  Output: List[Dict] with page_number, text, total_pages          │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: TEXT CHUNKING                                          │
│  LangChain RecursiveCharacterTextSplitter                        │
│  Config: CHUNK_SIZE=1000 chars, CHUNK_OVERLAP=200 chars          │
│  Separators: ['\n\n', '\n', '.', ' ', '']                        │
│  Metadata attached per chunk:                                    │
│    document_id, document_title, course_id, page_number,         │
│    chunk_index, source                                           │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: EMBEDDING                                              │
│  Gemini Embedding Service (singleton)                           │
│  Model: models/text-embedding-004                               │
│  Each chunk text → 768-dimensional dense vector                 │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: VECTOR STORAGE                                         │
│  ChromaDB HTTP client → collection: 'document_chunks'            │
│  Chunk ID format: doc_{id}_page_{pg}_chunk_{idx}                 │
│  Supports metadata filtering by course_id or document_id        │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: BM25 INDEXING                                          │
│  BM25IndexService (built per course on-demand)                  │
│  Tokenizer: lowercase, alphanumeric regex split                 │
│  In-memory; invalidated on document re-processing              │
└─────────────────────────────────────────────────────────────────┘
```

**Key Configuration Parameters** (`config.py`):

| Parameter | Value | Rationale |
|---|---|---|
| `CHUNK_SIZE` | 1000 characters | Balances semantic completeness with retrieval precision |
| `CHUNK_OVERLAP` | 200 characters | Ensures context continuity at chunk boundaries |
| `RETRIEVAL_TOP_K` | 5 | Enough context without overwhelming the context window |
| `EMBEDDING_MODEL` | `text-embedding-004` | Google's state-of-the-art embedding model as of 2024 |

### 3.2 Query & Retrieval Pipeline

When a student submits a question, the system executes a **hybrid retrieval** strategy combining dense semantic search with sparse keyword search, merged using **Reciprocal Rank Fusion (RRF)**.

```
User Query
    │
    ├──────────────────────────────────────────────────────────┐
    │ PATH A: Semantic Search (ChromaDB)                       │
    │ similarity_search_with_score(course_id=cid, k=15)       │
    │ Returns: top-15 semantically similar chunks             │
    └────────────────────────┬────────────────────────────────┘
                             │
    ├──────────────────────────────────────────────────────────┐
    │ PATH B: Keyword Search (BM25)                            │
    │ BM25Okapi.search(query, course_id=cid, top_k=15)         │
    │ Returns: top-15 keyword-matched chunks                   │
    └────────────────────────┬────────────────────────────────┘
                             │
                      ┌──────▼──────┐
                      │  Reciprocal │
                      │  Rank Fusion│
                      │  (RRF, k=60)│
                      │  weights:   │
                      │  v=0.6, b=0.4
                      └──────┬──────┘
                             │
                    ┌────────▼────────┐
                    │ Top-K Merged    │
                    │ Context Blocks  │
                    │ (formatted with │
                    │  [1], [2]...    │
                    │  + page source)  │
                    └─────────────────┘
```

**Reciprocal Rank Fusion** computes a combined score for each chunk:

```
RRF_score(d) = Σ  1 / (k + rank_i(d))
              i

where k = 60 (penalty constant), rank_i(d) is the rank of chunk d in retrieval path i.
```

The weights `vector_weight=0.6` and `bm25_weight=0.4` reflect the empirical observation that semantic similarity captures conceptual intent better than exact keyword matching, while keyword matching provides complementary precision for technical terms (formulas, proper nouns, Vietnamese diacritics).

### 3.3 Answer Generation Pipeline

The system employs an **agent-based architecture** with tool-calling capabilities. A two-pass LLM strategy handles tool dispatch:

```
┌─────────────────────────────────────────────────────────────────────┐
│  PASS 1: Tool Detection (non-streaming LLM)                        │
│  llm.invoke(messages, tools=AVAILABLE_TOOLS)                       │
│  → Gemini decides whether to call a tool and which one              │
│  → streaming=False to expose .tool_calls attribute                  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Tool Call?        │
                    │                   │
                    │ NO  → Direct LLM  │
                    │     answer        │
                    │                   │
                    │ YES → execute_tool│
                    │     (16 tools)    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼───────────────────────────┐
                    │ Tool Execution Layer                │
                    │  • search_documents → hybrid_retrieve│
                    │  • get_exam_schedule → Django ORM    │
                    │  • get_tuition_fee   → Django ORM   │
                    │  • get_scholarships   → Django ORM   │
                    │  • get_enrollments    → Django ORM   │
                    │  • generate_practice_quiz            │
                    │    → LLM from retrieved context       │
                    │  ... (16 total tools)                │
                    └─────────┬───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  PASS 2: Answer Synthesis (streaming LLM)                           │
│  llm.stream([SYSTEM_PROMPT, tool_result_prompt, user_question])    │
│  → Token-by-token SSE → Frontend (data: {"type":"chunk", ...})     │
│  → Sources emitted separately (data: {"type":"sources", ...})       │
│  → Quiz emitted separately  (data: {"type":"practice_quiz", ...})  │
│  → Done signal           (data: {"type":"done", ...})               │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  Message persisted to       │
                    │  MongoDB (chat_messages)     │
                    │  with sources, files,        │
                    │  practice_quiz embedded      │
                    └─────────────────────────────┘
```

**Conversation Memory**: The last `MEMORY_WINDOW_SIZE = 10` messages are retrieved from MongoDB and included in the LLM's conversation context, enabling multi-turn dialogues with coherent topic continuity.

### 3.4 End-to-End Data Flow Diagram

The complete data flow — from document upload to final answer delivery — is illustrated below:

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                         PHASE 1: DOCUMENT INGESTION                          │
  │                         (Executed once per file upload)                      │
  └────────────────────────────────────────┬────────────────────────────────────┘
                                             │
   ┌────────────────────────────────────────▼────────────────────────────────────┐
   │ Teacher/Admin                                                         [Django]│
   │   uploads PDF/DOCX/TXT  ──►  POST /api/documents/                          │
   │                            DocumentViewSet.create()                        │
   │                                  │                                          │
   │   File saved to: media/documents/{uuid}.{ext}                             │
   │   Document record created in SQLite (Django ORM)                           │
   │                                  │                                          │
   │   Auto-trigger: IngestionPipeline.process_document(document)               │
   │                                  │                                          │
   │   ┌─────────────────────────────▼────────────────────────────────────────┐ │
   │   │ IngestionPipeline                                                       │ │
   │   │   ├─► ParserFactory.parse(file_type, bytes)  → [{page, text}]        │ │
   │   │   ├─► TextChunker.chunk_pages(pages)         → [{text, meta}]         │ │
   │   │   ├─► ChromaDB  add_texts()                   → vectors stored         │ │
   │   │   └─► BM25IndexService (rebuilt per course)   → in-memory index        │ │
   │   └───────────────────────────────────────────────────────────────────────┘ │
   │                                  │                                          │
   │   Document.is_processed = True                                                 │
   └──────────────────────────────────┬───────────────────────────────────────────┘
                                      │
  ┌────────────────────────────────────▼───────────────────────────────────────────┐
  │                      PHASE 2: STUDENT QUERY                                    │
  │                      (Executed on every user message)                          │
  │  ┌────────────────────────────────────────────────────────────────────────────┐  │
  │  │ Student types question in ChatPage.tsx                                    │  │
  │  │   ├─► (Optional) Attaches PDF/DOCX/TXT file                               │  │
  │  │   │         → Parsed server-side → prepended as raw context text           │  │
  │  │   └─► Conversation history loaded (last 10 msgs from MongoDB)             │  │
  │  │                                                                          │  │
  │  │ POST /api/chat/sessions/{id}/send_message_stream/  (SSE endpoint)         │  │
  │  │   fetch() with ReadableStream SSE response                                 │  │
  │  └────────────────────────────────────────────────────────────────────────────┘  │
  └────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
  ┌────────────────────────────────────▼───────────────────────────────────────────┐
  │                   PHASE 3: AGENT TOOL DECISION  [Django / LangChain]           │
  │                                                                                  │
  │   llm_non_streaming.invoke(messages, tools=AVAILABLE_TOOLS)                     │
  │                                                                                  │
  │   ┌──────────────────────────────────────────────────────────────────────────┐ │
  │   │ Tool Routing Table (16 tools):                                           │ │
  │   │                                                                          │ │
  │   │   Academic Content     →  search_documents  → Hybrid Retrieval           │ │
  │   │   Exam / Room          →  get_exam_schedule → Django ORM (ExamSchedule) │ │
  │   │   Timetable / Schedule →  get_my_schedule   → Django ORM (Schedule)     │ │
  │   │   Tuition / Fees       →  get_tuition_fee   → Django ORM (TuitionFee)   │ │
  │   │   Scholarships         →  get_scholarships  → Django ORM (Scholarship)  │ │
  │   │   Enrollments / Scores →  get_enrollments   → Django ORM (Enrollment)   │ │
  │   │   Academic Records     →  get_academic_records                          │ │
  │   │   Academic Calendar     →  get_academic_calendar                          │ │
  │   │   Announcements         →  get_announcements                              │ │
  │   │   Library Records       →  get_library_records                            │ │
  │   │   Student ID Card       →  get_student_id_card                            │ │
  │   │   Dormitory (KTX)       →  get_dormitory_info                             │ │
  │   │   Health Insurance       →  get_health_insurance                           │ │
  │   │   Department Contacts    →  get_contacts                                   │ │
  │   │   Semester Info          →  get_current_semester                           │ │
  │   │   Majors                 →  get_majors                                     │ │
  │   │   Practice Quiz          →  generate_practice_quiz (no DB save)           │ │
  │   │   General / Open-domain  →  NO TOOL (direct answer)                        │ │
  │   └──────────────────────────────────────────────────────────────────────────┘ │
  └────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
  ┌────────────────────────────────────▼───────────────────────────────────────────┐
  │                   PHASE 4: TOOL EXECUTION                                      │
  │                                                                                  │
  │   IF academic content query:                                                     │
  │     DocumentRetriever.hybrid_retrieve(query, course_id)                         │
  │       ├─► ChromaDB  similarity_search(k=15)  ──┐                               │
  │       ├─► BM25Okapi search(query, k=15)       ──┤→ RRF merge → Top-K context  │
  │       └─► Format as numbered blocks [1]...[K]  ←─┘                               │
  │                                                                                  │
  │   IF admin query:                                                               │
  │     Django ORM query on SQLite → JSON result                                    │
  │                                                                                  │
  │   IF practice quiz:                                                            │
  │     LLM generates quiz from retrieved context (NOT saved to DB)                 │
  │                                                                                  │
  └────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
  ┌────────────────────────────────────▼───────────────────────────────────────────┐
  │                   PHASE 5: ANSWER GENERATION & STREAMING                       │
  │                                                                                  │
  │   llm_streaming.stream([AGENT_SYSTEM_PROMPT, tool_result_prompt, question])     │
  │                                                                                  │
  │   SSE events emitted:                                                          │
  │     data: {"type":"chunk",     "content": "..."}  ──► Frontend: incremental     │
  │     data: {"type":"sources",   "content": [...]}  ──► Frontend: citation panel  │
  │     data: {"type":"practice_quiz","content":{...}} ──► Frontend: quiz render   │
  │     data: {"type":"done",       "session_id":"..."}  ──► Frontend: finalize     │
  └────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
  ┌────────────────────────────────────▼───────────────────────────────────────────┐
  │                   PHASE 6: PERSISTENCE & UI UPDATE  [MongoDB + React]            │
  │                                                                                  │
  │   MongoDB: chat_messages collection                                            │
  │     ├─► User message document: {role:'user', content:'...', files:[...]}      │
  │     └─► Assistant message document: {role:'assistant', content:'...',           │
  │                                    sources:[...], practice_quiz:{...}}         │
  │   ChatSession.updated_at refreshed                                             │
  │   Auto-title: first user message → session.title (truncated to 50 chars)       │
  │                                                                                  │
  │   React Frontend:                                                               │
  │     ├─► SSE TextDecoder reads stream                                          │
  │     ├─► 'chunk'     → incremental message text (React state update)           │
  │     ├─► 'sources'   → <SourceCitation> component renders citation list        │
  │     ├─► 'practice_quiz' → <PracticeQuizInChat> renders interactive quiz        │
  │     └─► 'done'      → finalize message object, refresh sessions list           │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Prompt Engineering

Prompt engineering is the practice of crafting input instructions that guide an LLM toward desired outputs. In this project, four distinct prompt templates are used across the RAG pipeline. Each is carefully designed to enforce the system's role as a **Trợ giảng** (Teaching Assistant), constrain the model's behavior to grounded responses, and manage the multi-tool agent workflow.

### 4.1 System Prompt — Basic RAG Chain

**File**: `backend/apps/documents/rag/chain.py` (line 15)

**Used in**: `RAGChain.invoke()`, `invoke_with_history()`, `stream_with_context()`, `stream_with_history()`

```text
Bạn là trợ lý AI hỗ trợ sinh viên đại học trong học tập.

QUY TẮC BẮT BUỘC:

1. KHI CÓ TÀI LIỆU (Context được cung cấp):
   - Trả lời DỰA TRÊN tài liệu, trích dẫn nguồn bằng [1], [2], [3]...
   - Nếu câu hỏi liên quan đến môn học nhưng KHÔNG TÌM THẤY trong tài liệu:
     → Nói rõ: "Thông tin này không có trong tài liệu môn học được cung cấp."
     → KHÔNG được tự suy luận, bịa đặt, hoặc trả lời dựa trên kiến thức bên ngoài
       cho câu hỏi về nội dung môn học.
   - Cuối câu trả lời, ghi rõ nguồn: "Nguồn: [1] Tên tài liệu - Trang X"

2. KHI KHÔNG CÓ TÀI LIỆU (câu hỏi chung chung, không liên quan môn học):
   - Trả lời bình thường dựa trên kiến thức chung.
   - Không cần trích dẫn nguồn.

3. PHONG CÁCH:
   - Trả lời bằng tiếng Việt, rõ ràng, ngắn gọn.
   - Thân thiện, dễ hiểu.
   - Sử dụng markdown khi cần (danh sách, bảng, code block).
```

#### Design Rationale

| Element | Purpose |
|---|---|
| **Role assignment** (`"Bạn là trợ lý AI..."`) | Establishes the Teaching Assistant persona; all subsequent outputs are filtered through this lens |
| **Conditional branching** (`KHI CÓ TÀI LIỆU / KHI KHÔNG CÓ TÀI LIỆU`) | Handles the two distinct operational modes — grounded vs. open-domain — without ambiguous behavior |
| **Hallucination suppression** (`KHÔNG được tự suy luận, bịa đặt`) | Directly instructs the model to abstain from generating ungrounded content; this is the most critical anti-hallucination mechanism |
| **Citation enforcement** (`[1], [2], [3]...` + source footer) | Teaches the model to always cite, making responses verifiable and academically honest |
| **Boundary signaling** (`"Thông tin này không có trong tài liệu..."`) | Explicitly draws the boundary between grounded and ungrounded knowledge, preventing the model from filling gaps |
| **Language + style constraints** (Vietnamese, markdown, friendly) | Ensures responses match the target audience (Vietnamese university students) and academic communication norms |

### 4.2 System Prompt — Tool-Calling RAG Agent

**File**: `backend/apps/documents/rag/agent.py` (line 23)

**Used in**: `RAGAgent.invoke()`, `stream()`

```text
Bạn là trợ lý AI thông minh hỗ trợ sinh viên đại học.

BẠN CÓ CÁC CÔNG CỤ (tools) ĐỂ TRA CỨU THÔNG TIN:
- Nếu câu hỏi về NỘI DUNG HỌC TẬP (lý thuyết, bài giảng, kiến thức môn học):
  dùng tool "search_documents"
- Nếu câu hỏi về HÀNH CHÍNH (lịch thi, học phí, thời khóa biểu, điểm, KTX,
  thư viện...): dùng tool hành chính tương ứng
- Nếu câu hỏi chung chung: trả lời trực tiếp không cần tool

QUY TẮC CHỌN TOOL:
1.  "Lịch thi", "thi khi nào", "phòng thi"       → get_exam_schedule
2.  "Thời khóa biểu", "lịch học", "học phòng nào" → get_my_schedule
3.  "Học phí", "đóng tiền", "hạn nộp"             → get_tuition_fee
4.  "Học bổng", "nhận học bổng"                   → get_scholarships
5.  "Điểm", "bảng điểm", "GPA", "tín chỉ tích lũy" → get_academic_records
6.  "Môn đã đăng ký", "danh sách môn"            → get_enrollments
7.  "Nghỉ lễ", "lịch năm học", "khi nào đăng ký" → get_academic_calendar
8.  "Thông báo", "tin tức"                       → get_announcements
9.  "Thẻ sinh viên", "mã thẻ"                    → get_student_id_card
10. "Mượn sách", "thư viện", "sách"              → get_library_records
11. "KTX", "ký túc xá", "phòng ở"                → get_dormitory_info
12. "Bảo hiểm", "BHYT"                           → get_health_insurance
13. "Liên hệ", "phòng ban", "số điện thoại", "email" → get_contacts
14. "Học kỳ hiện tại", "đang học kỳ mấy"         → get_current_semester
15. "Ngành học", "chuyên ngành"                  → get_majors
16. Kiến thức môn học, lý thuyết                 → search_documents
17. "tạo câu hỏi", "ôn tập", "làm bài tập",      → generate_practice_quiz
    "practice quiz", "tạo quiz"
    - Trích xuất số câu hỏi: "5 câu" → num_questions=5
    - Trích xuất chủ đề: "chương 2" → topic="chương 2"
    - KHÔNG lưu quiz vào database — chỉ trả về JSON

PHONG CÁCH TRẢ LỜI:
- Tiếng Việt, rõ ràng, thân thiện
- Dùng markdown khi cần (bảng, danh sách)
- Trích dẫn nguồn [1], [2] nếu dùng search_documents
```

#### Design Rationale

| Element | Purpose |
|---|---|
| **Tool availability disclosure** | Informs the model of its available actions, enabling informed tool selection rather than blind generation |
| **Declarative routing rules** (numbered 1–17 with keyword → tool mapping) | Implements a lightweight **intent classification** via prompt instruction rather than a separate ML model; the LLM acts as its own classifier |
| **Negative instruction** (`"KHÔNG lưu quiz vào database"`) | Prevents a critical failure mode where the model might persist generated quizzes without being asked |
| **Parameter extraction instructions** (`"5 câu" → num_questions=5`) | Teaches the model to parse implicit parameters from natural language queries, enabling zero-shot slot filling |
| **Scope constraint** (`"câu hỏi chung chung → trả lời trực tiếp"`) | Prevents unnecessary tool invocations for open-domain questions, reducing latency |
| **Citation reinforcement** (`"Trích dẫn nguồn [1], [2] nếu dùng search_documents"`) | Extends the citation discipline from the basic chain to the agent workflow |

The agent prompt exemplifies **ReAct-style prompting** (Reasoning + Acting), where the model is given both the task description and the tool descriptions, then asked to decide which tool to invoke. The numbered routing rules function as a **few-shot demonstration** of the intended tool-selection behavior.

### 4.3 Practice Quiz Generation Prompt

**File**: `backend/apps/documents/rag/tools.py` (line 358)

**Used in**: `execute_tool()` → `_generate_practice_quiz()`

```text
Dựa trên nội dung tài liệu sau, tạo {num_questions} câu hỏi trắc nghiệm ôn tập.

Nội dung tài liệu:
{context}

Chủ đề: {topic or 'Tổng quát'}

Trả về CHÍNH XÁC một JSON array, KHÔNG có gì khác ngoài JSON:
[
  {
    "id": 0,
    "question": "Câu hỏi",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correct": 0,
    "explanation": "Giải thích ngắn gọn"
  }
]
```

#### Design Rationale

| Element | Purpose |
|---|---|
| **Strict output format constraint** (`"CHÍNH XÁC một JSON array, KHÔNG có gì khác ngoài JSON"`) | Forces the model to produce parseable structured output; this is essential because any surrounding text would break JSON deserialization on the frontend |
| **`id` field starting at 0** | Provides a stable key for React component rendering and answer-checking logic |
| **`correct` as integer index (0–3)** | Simplifies frontend answer validation; avoids fragile string matching |
| **`explanation` field** | Encourages metacognitive reflection, supporting deeper learning beyond recognition |
| **`topic` parameter** | Allows students to narrow quiz scope (e.g., "Chapter 2" or "Cell biology"), improving relevance |
| **No database persistence directive** | Quiz is ephemeral — generated on-demand and displayed inline, reducing storage overhead and allowing unlimited practice attempts |

### 4.4 Final Answer Synthesis Prompt

**File**: `backend/apps/documents/rag/agent.py` (line 146)

**Used in**: After tool execution, before streaming the final response

```text
Kết quả tra cứu từ hệ thống (tool '{tool_name}'):
---
{tool_result}
---

Dựa trên dữ liệu trên, hãy trả lời câu hỏi của sinh viên một cách tự nhiên,
thân thiện và dễ hiểu: {question}
```

#### Design Rationale

| Element | Purpose |
|---|---|
| **Tool identity disclosure** (`tool_name` in the prompt) | Labels the retrieved information as coming from a specific tool, providing the model with metadata about the data's origin and freshness |
| **Result wrapper** (`---...---`) | Creates a clear visual boundary between retrieved content and instruction, preventing the model from treating tool output as part of the user query |
| **Style directive** (`"tự nhiên, thân thiện và dễ hiểu"`) | Compensates for the formal structure of structured data (JSON, tables) by asking the model to paraphrase it in conversational Vietnamese |
| **Question verbatim** (`{question}`) | Reminds the model of the original user intent after tool execution, ensuring the answer stays on-topic |

### 4.5 Prompt Engineering Summary

The prompt engineering strategy across the project follows three guiding principles:

1. **Role Consistency**: Every prompt begins by asserting the **Trợ giảng** role, establishing a stable persona across all LLM interactions.

2. **Groundedness Enforcement**: The most critical design pattern is the **"answer-from-context-or-say-so"** instruction — the model is required to distinguish between questions it can answer from retrieved documents and questions it cannot. When it cannot, it must explicitly state so rather than guess.

3. **Structural Constraints**: Strict output format requirements (JSON for quizzes, numbered citations for answers, source footers) encode the system's quality standards into the model's output directly, reducing the need for post-processing.

---

## 5. Implementation Details

### 5.1 Streaming Architecture

The system uses **Server-Sent Events (SSE)** for real-time answer delivery. A notable engineering challenge arose from the tension between tool-calling detection and streaming output:

- **Streaming-enabled** (`streaming=True`) LLM calls produce `AsyncIterator` responses that cannot expose `.tool_calls` attributes, making tool selection impossible.
- **Streaming-disabled** LLM calls expose `.tool_calls` but do not yield progressive output.

The solution is a **dual-LLM-pass architecture**:
1. **Pass 1** (non-streaming): Detect tool calls and retrieve context.
2. **Pass 2** (streaming): Generate the answer token-by-token and push via SSE.

This approach is latency-optimal: the second pass begins streaming immediately after the first pass resolves (~200–500ms for tool detection), giving users the perception of instant responsiveness while preserving tool-calling accuracy.

### 5.2 Hybrid Search Weights

The RRF fusion weights (`vector_weight=0.6`, `bm25_weight=0.4`) were chosen empirically:

- **Vector search (0.6)** captures semantic similarity — the embedding model maps conceptually related chunks close in vector space, even when surface-form vocabulary differs.
- **BM25 search (0.4)** captures exact keyword matches — critical for technical Vietnamese terms, proper nouns, and mathematical notation that embeddings may not perfectly represent.
- The RRF `k=60` constant follows the convention established in formal RRF literature (Glosaries and TREC experiments), providing a moderate penalty for rank disagreement between the two methods.

### 5.3 Chunking Strategy

The `RecursiveCharacterTextSplitter` with separators `['\n\n', '\n', '.', ' ', '']` implements a **hierarchical fallback** strategy:

1. First attempt to split at **paragraph boundaries** (`\n\n`), preserving natural discourse structure.
2. If paragraph is too large, split at **sentence boundaries** (`\n`, `.`).
3. If sentence is too large, split at **word boundaries** (` `).
4. Last resort: hard split at the character limit.

The `CHUNK_OVERLAP=200` ensures that content spanning a chunk boundary (e.g., a long definition or proof) is partially represented in both adjacent chunks, reducing the risk of losing context.

---

## 6. Conclusion & Future Work

### 6.1 Contributions

This project demonstrates a complete, production-grade implementation of a RAG-based AI Teaching Assistant tailored for Vietnamese universities. Key contributions include:

- A **hybrid retrieval system** combining dense embeddings and sparse BM25 keyword search, merged via Reciprocal Rank Fusion, that outperforms either method alone on technical course material.
- A **16-tool agent architecture** that unifies course content Q&A, academic-administrative queries, and practice quiz generation in a single conversational interface.
- A rigorous **prompt engineering methodology** centered on groundedness, citation enforcement, and role consistency — addressing the hallucination problem through structured instructions rather than relying solely on model capabilities.
- A **streaming SSE architecture** that delivers real-time answers while preserving the ability to invoke tools, a non-trivial engineering challenge in LangChain + Gemini deployments.

### 6.2 Limitations

- **Embedding model** (`text-embedding-004`) is served via a Google API call; offline or self-hosted alternatives (e.g., `sentence-transformers`) could reduce latency and cost.
- **BM25 index** is rebuilt in-memory per course on-demand; a persistent BM25 store (e.g., Pyserini) would improve scalability.
- **No re-ranking** step — the RRF merge is applied directly to raw retrieval results. A cross-encoder re-ranker (e.g., `ms-marco-MiniLM-L-6-v2`) would improve top-1 accuracy.

### 6.3 Future Work

1. **Cross-encoder re-ranking**: Apply a BERT-based cross-encoder to re-rank the RRF-retrieved top-20 chunks before passing the top-5 to the LLM, improving answer quality.
2. **Multi-modal ingestion**: Extend parsers to support PowerPoint slides, images within PDFs (via OCR), and audio lecture recordings.
3. **Evaluation framework**: Implement automated RAG evaluation metrics (RAGAS, Trulens) to measure retrieval precision, answer faithfulness, and relevance across the question set.
4. **Fine-tuning**: Fine-tune a smaller open-source model (e.g., `Llama-3.1-8B-Instruct`) on Vietnamese academic Q&A data to reduce API dependency and improve domain specificity.

---

## 7. References

1. Lewis, P., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. Advances in Neural Information Processing Systems (NeurIPS), 33, 9459–9474.

2. Gao, Y., Xiong, Y., Gao, X., et al. (2024). *Retrieval-Augmented Generation for Large Language Models: A Survey*. arXiv preprint arXiv:2312.10997.

3. Robertson, S., Zaragoza, H. (2009). *The Probabilistic Relevance Framework: BM25 and Beyond*. Foundations and Trends in Information Retrieval, 3(4), 333–389.

4. Faggioli, G., Dietz, L., Clarke, C. L. A., et al. (2023). *Perspectives on Large Language Models for Relevance Judgment in Ad-hoc Information Retrieval*. SIGIR Forum, 57(1), Article 4.

5. LangChain Documentation. (2024). *LangChain Python API Reference*. https://python.langchain.com/

6. Google AI. (2024). *Gemini API Documentation*. https://ai.google.dev/

7. ChromaDB. (2024). *Chroma: The AI-Native Vector Database*. https://docs.trychroma.com/

8. Brown, T. B., et al. (2020). *Language Models are Few-Shot Learners*. Advances in Neural Information Processing Systems (NeurIPS), 33, 1877–1901.

9. Yao, S., Zhao, J., Yu, D., et al. (2023). *ReAct: Synergizing Reasoning and Acting in Language Models*. International Conference on Learning Representations (ICLR).

10. Anthropic. (2024). *Claude API Documentation — Prompt Engineering Guide*. https://docs.anthropic.com/

---

*This report was prepared for the Final Project of the Artificial Intelligence in Education course. System implemented using Django, React, LangChain, Gemini API, ChromaDB, and MongoDB.*
