import os
import google.generativeai as genai
from typing import List, Dict, Any, Optional
import logging
import json
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self):
        # Keep existing default api_key if present; production should use GEMINI_API_KEY in .env
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = None
        # chat_sessions maps session_id -> { 'history': [messages], 'selected_documents': [filenames] }
        self.chat_sessions = {}

    async def test_api_key(self, api_key: str) -> bool:
        """Test if the provided API key is valid"""
        try:
            genai.configure(api_key=api_key)

            # Choose model from env if provided, otherwise attempt to discover a usable model
            model_name = os.getenv("GEMINI_MODEL")
            try:
                if not model_name:
                    # try to discover a suitable model via the SDK
                    model_name = self._discover_model_name()
                    logger.info(f"Discovered model name: {model_name}")

                if model_name:
                    model = genai.GenerativeModel(model_name)
                else:
                    # No model available from env or discovery: raise a clear error
                    raise Exception("No GEMINI_MODEL configured and SDK discovery failed")

                # Make a simple test request using the instance
                response = model.generate_content("Hello, this is a test.")
            except Exception as me:
                # Provide a helpful error mentioning model choice
                raise Exception(f"Failed to create/generate with model (GEMINI_MODEL={model_name}): {me}")

            self.api_key = api_key
            self.model = model

            logger.info("API key validated successfully")
            return True

        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            raise Exception(f"Invalid API key: {str(e)}")

    async def generate_response(self, message: str, context_docs: List[Dict[str, Any]], session_id: Optional[str] = None) -> Dict[str, str]:
        """Generate response using RAG approach"""
        try:
            if not self.api_key or not self.model:
                # Reconfigure with stored API key
                api_key = os.getenv("GEMINI_API_KEY")
                if api_key:
                    await self.test_api_key(api_key)
                else:
                    raise Exception("Gemini API key not configured")

            # Generate session ID if not provided
            if not session_id:
                session_id = str(uuid.uuid4())

            # Prepare context from retrieved documents
            context = ""
            if context_docs:
                context = "\n\n".join([
                    f"Document: {doc['filename']}\nContent: {doc['content']}"
                    for doc in context_docs[:3]  # Use top 3 most relevant documents
                ])

            # Prepare the prompt with context and/or conversation history
            # Include recent chat history (if any) so the assistant can continue a multi-turn conversation even when there are no external documents.
            conversation_history = ''
            try:
                recent = self.chat_sessions.get(session_id, [])[-12:]
                if recent:
                    # Format as Speaker: message lines
                    conversation_history = '\n'.join([
                        f"{('User' if m['role']=='user' else 'Assistant')}: {m['message']}"
                        for m in recent
                    ])
            except Exception:
                conversation_history = ''

            if context:
                prompt = f"""You are a helpful AI assistant with access to a knowledge base. Use the following context to answer the user's question accurately and comprehensively. If the context doesn't contain relevant information, give the best helpful answer you can using general knowledge, and continue the conversation naturally.

Context from knowledge base:
{context}

Conversation history (most recent first):
{conversation_history}

User question: {message}

Please provide a helpful response based on the context above and the conversation history."""
            else:
                # No external context available — behave like a regular conversational assistant.
                if conversation_history:
                    prompt = f"""You are a helpful conversational AI. Continue the conversation naturally based on the recent messages below. Provide a clear, friendly, and helpful response. If you don't know something, say so and offer to help find out.

Conversation history (most recent first):
{conversation_history}

Respond to the user's latest message."""
                else:
                    # No history and no context: standard single-turn conversational reply
                    prompt = f"""You are a helpful conversational AI assistant. The user asked: {message}

Please respond helpfully and conversationally. If you don't know the answer, say so and offer guidance."""

            # Get or create chat session (structure)
            if session_id not in self.chat_sessions:
                self.chat_sessions[session_id] = {"history": [], "selected_documents": []}

            # Add user message to session history
            self.chat_sessions[session_id]["history"].append({
                "role": "user",
                "message": message,
                "timestamp": datetime.now().isoformat()
            })

            # Generate response using Gemini
            # Use model instance (already configured) to generate content
            try:
                response = self.model.generate_content(prompt)
            except Exception as gen_e:
                # Try to re-create model if missing and retry once
                model_name = os.getenv("GEMINI_MODEL")
                try:
                    if not model_name:
                        model_name = self._discover_model_name()
                        logger.info(f"Retry discovered model: {model_name}")

                    if model_name:
                        self.model = genai.GenerativeModel(model_name)
                    else:
                        raise Exception("No model available to retry generation")
                    response = self.model.generate_content(prompt)
                except Exception as re_e:
                    raise Exception(f"Generation failed: {gen_e}; retry attempt failed: {re_e}")

            # Extract response text
            response_text = response.text if getattr(response, 'text', None) else "I apologize, but I couldn't generate a response at this time."

            # Add assistant response to session history
            self.chat_sessions[session_id]["history"].append({
                "role": "assistant",
                "message": response_text,
                "timestamp": datetime.now().isoformat()
            })

            return {
                "message": response_text,
                "session_id": session_id
            }

        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return {
                "message": f"I apologize, but I encountered an error: {str(e)}",
                "session_id": session_id or str(uuid.uuid4())
            }

    def _discover_model_name(self) -> Optional[str]:
        """Try several SDK listing APIs to discover available models for the configured API key.
        Returns a model name string or None if discovery failed.
        """
        try:
            # Try primary helper
            models = None
            try:
                models = genai.list_models()
            except Exception:
                pass

            # Some sdk versions expose models under genai.models.list()
            if models is None:
                try:
                    models = genai.models.list()
                except Exception:
                    pass

            # Some SDKs use a Client wrapper
            if models is None:
                try:
                    client = getattr(genai, 'Client', None)
                    if client:
                        c = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
                        models = c.list_models()
                except Exception:
                    pass

            if not models:
                return None

            # Normalize to iterable of names
            names = []
            try:
                # models may be a mapping with 'data' key or a list
                iterable = models.get('data') if isinstance(models, dict) and 'data' in models else models
                for m in iterable:
                    if isinstance(m, dict):
                        name = m.get('name') or m.get('model')
                    else:
                        name = getattr(m, 'name', None) or getattr(m, 'model', None)
                    if name:
                        names.append(name)
            except Exception:
                return None

            if not names:
                return None

            # Prefer common production-like Gemini models
            preferred = ['gemini-pro', 'gemini-1.5', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini']
            for p in preferred:
                for n in names:
                    if p in n:
                        return n

            # Fallback to first available name
            return names[0]
        except Exception:
            return None

    async def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get chat history for a session"""
        try:
            sess = self.chat_sessions.get(session_id)
            if not sess:
                return {"history": [], "selected_documents": []}
            # Backwards compatibility: if sess is a plain list
            if isinstance(sess, list):
                return {"history": sess, "selected_documents": []}
            return {"history": sess.get("history", []), "selected_documents": sess.get("selected_documents", [])}
        except Exception as e:
            logger.error(f"Error getting chat history: {str(e)}")
            return {"history": [], "selected_documents": []}

    async def clear_chat_history(self, session_id: str) -> bool:
        """Clear chat history for a session"""
        try:
            if session_id in self.chat_sessions:
                del self.chat_sessions[session_id]
                logger.info(f"Cleared chat history for session {session_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error clearing chat history: {str(e)}")
            return False

    async def get_all_sessions(self) -> List[str]:
        """Get all active session IDs"""
        try:
            return list(self.chat_sessions.keys())
        except Exception as e:
            logger.error(f"Error getting sessions: {str(e)}")
            return []

    async def set_selected_documents(self, session_id: str, filenames: List[str]) -> bool:
        """Store selected document filenames for a session"""
        try:
            if session_id not in self.chat_sessions:
                self.chat_sessions[session_id] = {"history": [], "selected_documents": filenames}
            else:
                sess = self.chat_sessions[session_id]
                if isinstance(sess, list):
                    # convert to new shape
                    self.chat_sessions[session_id] = {"history": sess, "selected_documents": filenames}
                else:
                    sess["selected_documents"] = filenames
            return True
        except Exception as e:
            logger.error(f"Error setting selected documents for {session_id}: {str(e)}")
            return False
