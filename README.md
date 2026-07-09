# 📄 AI Document Search — RAG Chatbot

A full-stack **Retrieval-Augmented Generation (RAG)** chatbot that lets you upload PDF documents, index them into a vector store, and ask natural-language questions — with **inline citations** pulled directly from source pages.

<p align="center">
  <a href="https://rag-chatbot-ipcf.onrender.com" target="_blank">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-rag--chatbot--ipcf.onrender.com-7c3aed?style=for-the-badge&labelColor=1e1e2e" alt="Live Demo" />
  </a>
</p>

> **🔗 Try it live:** [https://rag-chatbot-ipcf.onrender.com](https://rag-chatbot-ipcf.onrender.com)

---

## ✨ Features

- **PDF Upload & Chunking** — Drag-and-drop PDFs, which are automatically chunked with LangChain's `RecursiveCharacterTextSplitter` for optimal retrieval.
- **Multi-Provider LLM Support** — Switch between **OpenAI** (GPT-4o-mini) and **Google Gemini** (1.5 Flash) with a single toggle.
- **Flexible Vector Storage** — Choose between local storage (FAISS / NumPy fallback) or **Pinecone** cloud for production-scale indexing.
- **Citation-Backed Answers** — Every AI response includes expandable source citations with document name, page number, and verbatim text.
- **Modern Glassmorphism UI** — Dark-themed React frontend with smooth animations, drag-and-drop upload, and live backend status monitoring.

---

## 🔍 How It Works

This app uses the **RAG (Retrieval-Augmented Generation)** pattern to answer questions grounded in your uploaded documents, not general knowledge. Here's the step-by-step pipeline:

### 📤 Step 1 — Document Upload & Indexing

```
PDF File ──► Text Extraction ──► Chunking ──► Embedding ──► Vector Store
              (pypdf)        (1000 chars,     (OpenAI /      (FAISS /
                              200 overlap)    Google API)     Pinecone)
```

1. You upload a PDF through the sidebar drag-and-drop zone.
2. **Text extraction** — `pypdf` reads each page and extracts raw text.
3. **Chunking** — The text is split into overlapping chunks (~1000 characters each, 200-character overlap) using LangChain's `RecursiveCharacterTextSplitter`. Overlap ensures context isn't lost at chunk boundaries.
4. **Embedding** — Each chunk is converted into a high-dimensional vector using an embedding model (`text-embedding-3-small` for OpenAI or `text-embedding-004` for Google).
5. **Storage** — The vectors are stored in a vector database (FAISS locally, or Pinecone cloud) alongside the original text and metadata (filename, page number).

### 💬 Step 2 — Chat & Retrieval

```
User Query ──► Query Embedding ──► Similarity Search ──► Top-K Chunks
                (same model)        (cosine similarity)   (k=4 most
                                                          relevant)
```

1. You type a question in the chat interface.
2. Your query is embedded using the **same embedding model** used during indexing.
3. The system performs a **cosine similarity search** against all stored vectors.
4. The **top 4 most relevant chunks** are retrieved, along with their source metadata.

### 🤖 Step 3 — Answer Generation

```
System Prompt + Retrieved Chunks + User Query ──► LLM ──► Cited Answer
                                                (GPT-4o-mini /
                                                 Gemini 1.5 Flash)
```

1. The retrieved chunks are formatted with `[Doc 1]`, `[Doc 2]` labels and injected into a carefully crafted **system prompt**.
2. The LLM is instructed to:
   - Answer **only** from the provided context
   - Use **inline citations** like `[Doc 1]`, `[Doc 2]`
   - Admit when information isn't available
3. The response is rendered as **formatted markdown** with expandable citation blocks showing the exact source text, document name, and page number.

### 🏗 Architecture Overview

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

---

## 📖 How to Use It

### Using the Live App

1. **Open the app** → [https://rag-chatbot-ipcf.onrender.com](https://rag-chatbot-ipcf.onrender.com)

2. **Configure your API key** (required):
   - In the left sidebar, choose your AI provider — **OpenAI** or **Google Gemini**
   - Paste your API key in the input field
   - Your key is stored **locally in your browser** (never sent to our server, only forwarded to the AI provider's API)

3. **Upload a PDF document**:
   - Drag and drop a `.pdf` file onto the upload zone in the sidebar
   - Or click the zone to browse your files
   - Wait for the "Processing PDF..." indicator to complete
   - Your document will appear in the "Documents Indexed" list

4. **Ask questions**:
   - Type a question in the chat input at the bottom
   - The AI will search your documents and respond with a cited answer
   - Click **"Source Citations"** on any response to see the exact text excerpts used

5. **Try suggested prompts** — When documents are indexed, the chat area shows quick-start prompts like:
   - *"What is the main finding in the text?"*
   - *"Summarize the key sections."*
   - *"Are there any specific dates or figures?"*

> **💡 Tip:** You can upload multiple PDFs and ask questions that span across all of them. The AI will pull relevant context from whichever document is most relevant.

> **⚠️ Note:** The live demo runs on Render's free tier. The first load may take ~30 seconds if the server has spun down due to inactivity.

---

## 🚀 Run It Locally

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

### 3. Open in Browser

Navigate to `http://localhost:5173`, configure your API key in the sidebar, and start chatting!

---

## 🐳 Docker Deployment

```bash
docker compose up --build
```

This builds both frontend and backend into a single container, accessible at `http://localhost:8000`.

---

## 🧪 Running Tests

```bash
cd backend
python -m unittest tests.test_rag -v
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 |
| **Backend** | FastAPI, Python 3.10+, Uvicorn |
| **AI/LLM** | LangChain, OpenAI GPT-4o-mini, Google Gemini 1.5 Flash |
| **Embeddings** | OpenAI `text-embedding-3-small`, Google `text-embedding-004` |
| **Vector DB** | FAISS (local), NumPy fallback, Pinecone (cloud) |
| **PDF Processing** | pypdf, LangChain RecursiveCharacterTextSplitter |
| **Deployment** | Docker, Render |
| **UI Design** | Glassmorphism, Lucide icons, Google Fonts (Inter, Outfit) |

---

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
├── render.yaml                 # Render deployment config
└── README.md
```

---

## 📜 License

This project is open source.
