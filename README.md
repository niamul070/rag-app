# RAG Chatbot

A lightweight RAG (Retrieval-Augmented Generation) chatbot built with React frontend and Python backend, using Gemini API and ChromaDB for document storage and retrieval.

## Features

- 🤖 **Intelligent Chat**: Powered by Google's Gemini 2.5 Flash model
- 📚 **Document Knowledge Base**: Upload and query PDF, HTML, TXT, and Markdown files
- 🔍 **Semantic Search**: CPU-only vector database for efficient document retrieval
- 💬 **Chat Memory**: Persistent conversation history with session management
- 🎨 **Modern UI**: Clean, responsive React interface with Tailwind CSS
- ⚡ **Lightweight**: Optimized for minimal hardware requirements

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS, Lucide React icons
- **Backend**: FastAPI with Python
- **Vector Database**: ChromaDB (CPU-only, no GPU required)
- **AI Model**: Google Gemini 2.5 Flash
# RAG Chatbot

A lightweight RAG (Retrieval-Augmented Generation) chatbot built with a React frontend and a Python FastAPI backend. The backend indexes documents into ChromaDB and uses a generative model (Gemini) to answer user queries with retrieval-augmented context.

Features
--------

- Intelligent chat powered by a generative model
- Document knowledge base (PDF, HTML, TXT, Markdown)
- Semantic search via ChromaDB + sentence-transformers
- Session-based chat history and document selection per session
- Modern React + Tailwind frontend

Architecture
------------

- Frontend: React + TypeScript, Tailwind CSS
- Backend: FastAPI (Python)
- Vector DB: ChromaDB (CPU-only)
- Model: Google Gemini (server-side key)

Quickstart
----------

Prerequisites

- Python 3.9+
- Node.js 16+
- pdm (the backend start script will install it if missing)
- (Optional) GitHub CLI `gh` to automate repo creation

Backend (local)

1. Create a local `.env` in `backend/` (do NOT commit):

   Create `backend/.env` with at least:

   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=optional_model_name

2. Start the backend (helper installs pdm and runs the app):

```bash
chmod +x start_backend.sh
./start_backend.sh
```

Or manually:

```bash
cd backend
python3 -m pip install --user pdm
export PATH="$HOME/.local/bin:$PATH"
pdm install
pdm run start
```

Backend will be available at http://localhost:8000 and API docs at http://localhost:8000/docs

Frontend (local)

```bash
cd frontend
npm install
npm start
```

Open the app at http://localhost:3000

How documents are used
----------------------

- Upload documents via the frontend. Files are processed and indexed into ChromaDB.
- In the Chat UI you can select which documents to include in the context for a message. Those filenames are sent to the backend and used to build the prompt.
- The ChromaDB data directory (e.g. `backend/chroma_db/`) is ignored by `.gitignore` and must not be committed.

Sessions and persistence
------------------------

- Chat sessions and selected documents are stored in-memory by default and will be lost on backend restart.
- If you need persistence, add a small SQLite or JSON-backed store and add the DB file(s) to `.gitignore`.

Security: what NOT to commit
---------------------------

Do NOT commit any of the following to a public repo:

- `backend/.env` or any file containing API keys (GEMINI_API_KEY, etc.)
- ChromaDB/embedding stores
- Uploaded documents and processed files
- Session persistence files, runtime caches, or local DB files


Security checklist before pushing

- Confirm `.env` and any keys are not staged (git status)
- Confirm `backend/chroma_db/`, `backend/uploads/`, or other data folders are not staged

Optional helper script
----------------------

I can add `scripts/create_github_repo.sh` that will call `gh repo create` and push `develop base` for you. It will not contain credentials.

Troubleshooting
---------------

- If `pdm install` fails with build errors, check `backend/pyproject.toml` and the pdm logs. The project includes packaging settings to work with editable installs.
- If ChromaDB errors reference NumPy 2.0 incompatibilities, ensure the backend environment uses `numpy>=1.24,<2.0`.
- If the frontend complains about a missing API key, ensure `backend/.env` has `GEMINI_API_KEY` and the backend is running.



License
-------

MIT
# rag-chatbot
