from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import logging

from services.document_service import DocumentService
from services.chat_service import ChatService
from services.vector_service import VectorService
from models.database import get_db

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RAG Chatbot API", version="1.0.0")


@app.on_event("startup")
async def check_api_key_on_startup():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        logger.warning("GEMINI_API_KEY is not set. Please add it to the backend .env file for the chatbot to function.")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
document_service = DocumentService()
chat_service = ChatService()
vector_service = VectorService()

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    selected_documents: Optional[List[str]] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

# Routes
@app.get("/")
async def root():
    return {"message": "RAG Chatbot API is running"}

@app.post("/api/upload", response_model=dict)
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload and process files to add to knowledge base"""
    try:
        results = []
        for file in files:
            # Validate file type
            allowed_extensions = ['.pdf', '.html', '.htm', '.txt', '.md']
            file_extension = os.path.splitext(file.filename)[1].lower()
            
            if file_extension not in allowed_extensions:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": f"File type {file_extension} not supported"
                })
                continue
            
            # Process file
            content = await document_service.process_file(file)
            if content:
                # Add to vector database
                await vector_service.add_document(file.filename, content)
                results.append({
                    "filename": file.filename,
                    "status": "success",
                    "message": "File processed and added to knowledge base"
                })
            else:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": "Failed to extract content from file"
                })
        
        return {"results": results}
    except Exception as e:
        logger.error(f"Error uploading files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatMessage):
    """Chat with the RAG chatbot"""
    try:
        if not os.getenv("GEMINI_API_KEY"):
            raise HTTPException(status_code=400, detail="Gemini API key not set")
        
        # Retrieve relevant documents (semantic search)
        relevant_docs = await vector_service.search_similar(request.message)

        # If the client provided explicit selected_documents, retrieve their contents and prepend to context_docs
        context_docs = relevant_docs
        if request.selected_documents:
            selected_docs = []
            for fname in request.selected_documents:
                content = await vector_service.get_document_content(fname)
                if content:
                    selected_docs.append({
                        "filename": fname,
                        "content": content
                    })
            # Prepend selected docs so they are prioritized
            context_docs = selected_docs + relevant_docs
        
        # Generate response using RAG
        response = await chat_service.generate_response(
            message=request.message,
            context_docs=context_docs,
            session_id=request.session_id
        )
        
        return ChatResponse(
            response=response["message"],
            session_id=response["session_id"]
        )
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    try:
        history = await chat_service.get_chat_history(session_id)
        # chat_service.get_chat_history returns a dict {history: [...], selected_documents: [...]}
        if isinstance(history, dict) and 'history' in history:
            return history
        # Fallback for older shapes: wrap as {history: [...], selected_documents: []}
        return {"history": history, "selected_documents": []}
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session"""
    try:
        await chat_service.clear_chat_history(session_id)
        return {"message": "Chat history cleared"}
    except Exception as e:
        logger.error(f"Error clearing chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def list_documents():
    """List all documents in the knowledge base"""
    try:
        documents = await vector_service.list_documents()
        return {"documents": documents}
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/sessions")
async def list_chat_sessions():
    """Return a list of active chat session IDs"""
    try:
        sessions = await chat_service.get_all_sessions()
        return {"sessions": sessions}
    except Exception as e:
        logger.error(f"Error listing chat sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents/content/{filename}")
async def get_document_content(filename: str):
    """Return concatenated content for a document by filename"""
    try:
        content = await vector_service.get_document_content(filename)
        return {"filename": filename, "content": content}
    except Exception as e:
        logger.error(f"Error getting document content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/selected_documents")
async def set_selected_documents(payload: dict):
    """Set selected documents for a session. Expects JSON { session_id: str, selected_documents: [filenames] }"""
    try:
        session_id = payload.get('session_id')
        selected = payload.get('selected_documents', [])
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        ok = await chat_service.set_selected_documents(session_id, selected)
        if not ok:
            raise HTTPException(status_code=500, detail="Failed to set selected documents")
        return {"message": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting selected documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document from the knowledge base"""
    try:
        await vector_service.delete_document(document_id)
        return {"message": "Document deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
