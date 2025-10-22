import chromadb
from chromadb.config import Settings
import os
import uuid
from typing import List, Dict, Any
import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self):
        # Initialize ChromaDB with CPU-only settings
        self.client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Initialize sentence transformer model (CPU-only)
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Create or get collection
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"description": "RAG chatbot documents"}
        )
        
        logger.info("Vector service initialized with ChromaDB")
    
    async def add_document(self, filename: str, content: str) -> str:
        """Add document to vector database"""
        try:
            # Split content into chunks for better retrieval
            chunks = self._chunk_text(content)
            
            # Generate embeddings for chunks
            embeddings = self.embedding_model.encode(chunks).tolist()
            
            # Create document IDs
            doc_ids = [f"{filename}_{uuid.uuid4()}" for _ in chunks]
            
            # Prepare metadata
            metadatas = [
                {
                    "filename": filename,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
                for i in range(len(chunks))
            ]
            
            # Add to collection
            self.collection.add(
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
                ids=doc_ids
            )
            
            logger.info(f"Added document {filename} with {len(chunks)} chunks")
            return filename
            
        except Exception as e:
            logger.error(f"Error adding document {filename}: {str(e)}")
            raise e
    
    async def search_similar(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query]).tolist()
            
            # Search in collection
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=n_results
            )
            
            # Format results
            similar_docs = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    similar_docs.append({
                        "content": doc,
                        "filename": results['metadatas'][0][i]['filename'],
                        "distance": results['distances'][0][i] if results['distances'] else 0,
                        "metadata": results['metadatas'][0][i]
                    })
            
            return similar_docs
            
        except Exception as e:
            logger.error(f"Error searching similar documents: {str(e)}")
            return []
    
    async def list_documents(self) -> List[Dict[str, Any]]:
        """List all documents in the knowledge base"""
        try:
            # Get all documents
            results = self.collection.get()
            
            # Group by filename
            documents = {}
            if results['documents']:
                for i, doc in enumerate(results['documents']):
                    filename = results['metadatas'][i]['filename']
                    if filename not in documents:
                        documents[filename] = {
                            "filename": filename,
                            "chunks": 0,
                            "total_chunks": results['metadatas'][i].get('total_chunks', 1)
                        }
                    documents[filename]["chunks"] += 1
            
            return list(documents.values())
            
        except Exception as e:
            logger.error(f"Error listing documents: {str(e)}")
            return []
    
    async def delete_document(self, filename: str) -> bool:
        """Delete document from knowledge base"""
        try:
            # Get all documents with this filename
            results = self.collection.get(
                where={"filename": filename}
            )
            
            if results['ids']:
                # Delete all chunks of this document
                self.collection.delete(ids=results['ids'])
                logger.info(f"Deleted document {filename}")
                return True
            else:
                logger.warning(f"Document {filename} not found")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting document {filename}: {str(e)}")
            return False

    async def get_document_content(self, filename: str) -> str:
        """Retrieve the full text content for a document by filename by concatenating its chunks in order."""
        try:
            results = self.collection.get(
                where={"filename": filename}
            )

            if not results or not results.get('documents'):
                return ""

            # Collect chunks with their metadata (chunk_index)
            chunks_with_index = []
            for i, doc in enumerate(results['documents']):
                meta = results.get('metadatas', [])[i] if results.get('metadatas') else {}
                idx = meta.get('chunk_index', i)
                chunks_with_index.append((idx, doc))

            # Sort by chunk index and join
            chunks_with_index.sort(key=lambda x: x[0])
            content = '\n\n'.join([c for _, c in chunks_with_index])
            return content
        except Exception as e:
            logger.error(f"Error getting document content for {filename}: {str(e)}")
            return ""
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                sentence_endings = ['.', '!', '?', '\n\n']
                for i in range(min(100, chunk_size)):
                    if text[end - i] in sentence_endings:
                        end = end - i + 1
                        break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            
        return chunks
