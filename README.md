# 📄 AI Document Search — RAG Chatbot

A full-stack **Retrieval-Augmented Generation (RAG)** chatbot that lets you upload PDF documents, index them into a vector store, and ask natural-language questions — with **inline citations** pulled directly from source pages.

## ✨ Features

- **PDF Upload & Chunking** — Drag-and-drop PDFs, which are automatically chunked with LangChain's `RecursiveCharacterTextSplitter` for optimal retrieval.
- **Multi-Provider LLM Support** — Switch between **OpenAI** (GPT-4o-mini) and **Google Gemini** (1.5 Flash) with a single toggle.
- **Flexible Vector Storage** — Choose between local storage (FAISS / NumPy fallback) or **Pinecone** cloud for production-scale indexing.
- **Citation-Backed Answers** — Every AI response includes expandable source citations with document name, page number, and verbatim text.
- **Modern Glassmorphism UI** — Dark-themed React frontend with smooth animations, drag-and-drop upload, and live backend status monitoring.

## 🏗 Architecture

```
┌──────────────────────────┐       ┌──────────────────────────────┐
│    React Frontend        │       │    FastAPI Backend            │
│    (Vite + TypeScript)   │◄─────►│    (Python 3.10+)            │
│                          │  API  │                              │
│  • Sidebar config panel  │       │  • /api/upload   - PDF ingest│
│  • Chat interface        │       │  • /api/chat     - RAG query │
│  • Citation viewer       │       │  • /api/documents- Index mgmt│
│  • Health status monitor │       │  • /api/health   - Heartbeat │
└──────────────────────────┘       └──────────┬───────────────────┘
                                              │
                                   ┌──────────▼───────────────────┐
                                   │   Vector Store               │
                                   │  (FAISS / NumPy / Pinecone)  │
                                   └──────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python** 3.10+
- **Node.js** 20+
- An API key from **OpenAI** or **Google AI Studio**

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
python main.py
```

The API server starts at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with API requests auto-proxied to the backend.

### 3. Usage

1. Enter your **API key** in the sidebar settings panel.
2. **Upload** one or more PDF files via drag-and-drop.
3. **Ask questions** in the chat — the AI will retrieve relevant chunks and answer with citations.

## 🐳 Docker Deployment

```bash
docker compose up --build
```

This builds both frontend and backend into a single container, accessible at `http://localhost:8000`.

## 🧪 Running Tests

```bash
cd backend
venv\Scripts\python.exe -m unittest tests.test_rag -v
```

## 📁 Project Structure

```
├── backend/
│   ├── core/
│   │   ├── pdf_processor.py    # PDF text extraction & chunking
│   │   ├── vector_store.py     # FAISS/NumPy/Pinecone vector management
│   │   └── llm_chain.py        # RAG prompt + LLM invocation
│   ├── tests/
│   │   └── test_rag.py         # Unit tests
│   ├── main.py                 # FastAPI server & endpoints
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx     # Config, upload, document management
│   │   │   └── ChatArea.tsx    # Chat UI with markdown & citations
│   │   ├── App.tsx             # Main app state & API integration
│   │   └── index.css           # Glassmorphism design system
│   └── package.json
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml          # Container orchestration
└── README.md
```

## 📜 License

This project is open source.
