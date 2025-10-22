import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import { apiService } from '../services/apiService';

interface ChatInterfaceProps {
  sessionId: string;
  onMessageSent: (message: string) => void;
  onResponseReceived: (response: string) => void;
  onSelectSession?: (sessionId: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionId, 
  onMessageSent, 
  onResponseReceived,
  onSelectSession,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{ filename: string }[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>(sessionId);

  // Keep internal selected state in sync when parent changes sessionId
  useEffect(() => {
    setSelected(sessionId);
  }, [sessionId]);

  useEffect(() => {
    loadChatHistory();
    loadSessions();
    loadDocuments();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const response = await apiService.getChatHistory(sessionId);
      if (response.history) {
        setMessages(response.history);
      }
      // Restore selected documents if the session has them
      if (response.selected_documents) {
        setSelectedDocs(response.selected_documents || []);
      } else {
        setSelectedDocs([]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await apiService.listChatSessions();
      setSessions(response.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await apiService.listDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to UI immediately
    const newUserMessage: ChatMessage = {
      role: 'user',
      message: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);
    onMessageSent(userMessage);

    try {
      const response = await apiService.sendMessage(userMessage, sessionId, selectedDocs);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        message: response.response,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      onResponseReceived(response.response);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDocSelection = (filename: string) => {
    setSelectedDocs(prev => {
      let next: string[];
      if (prev.includes(filename)) next = prev.filter(f => f !== filename);
      else next = [...prev, filename];

      // Persist selection on backend for this session
      (async () => {
        try {
          await apiService.setSelectedDocuments(sessionId, next);
        } catch (err) {
          console.error('Failed to persist selected documents:', err);
        }
      })();

      return next;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="flex h-[600px]">
      {/* Chat column */}
      <div className="flex-1 flex flex-col border-r border-gray-200">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Welcome to RAG Chatbot!</p>
              <p className="text-sm">Ask me anything about your uploaded documents.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex w-full lg:max-w-3xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 mt-0.5" />
                      ) : (
                        <Bot className="w-4 h-4 mt-0.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about your documents..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Sessions column */}
  <aside className="w-96 bg-white">
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-gray-700">Sessions</h3>
          <p className="text-xs text-gray-500">Select a session to view its history</p>
        </div>
        <div className="p-2 overflow-y-auto h-[calc(100%-64px)]">
          {/* Documents selection */}
          <div className="p-3 border-b">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Include documents</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {documents.length === 0 ? (
                <div className="text-xs text-gray-500">No documents available</div>
              ) : (
                documents.map((d) => (
                  <label key={d.filename} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(d.filename)}
                      onChange={() => toggleDocSelection(d.filename)}
                      className="form-checkbox h-4 w-4 text-primary-600"
                    />
                    <span className="truncate">{d.filename}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {sessions.length === 0 ? (
            <div className="text-sm text-gray-500 p-4">No sessions yet</div>
          ) : (
            sessions.map((s) => (
              <div key={s} className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    setSelected(s);
                    if (onSelectSession) onSelectSession(s);
                    // load selected session history
                    (async () => {
                      try {
                        const res = await apiService.getChatHistory(s);
                        setMessages(res.history || []);
                        if (res.selected_documents) setSelectedDocs(res.selected_documents || []);
                      } catch (err) {
                        console.error('Failed to load selected session:', err);
                      }
                    })();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md ${selected === s ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-50'}`}
                >
                  <div className="text-sm truncate">{s}</div>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm('Delete this session and its history?')) return;
                    try {
                      await apiService.deleteChatSession(s);
                      setSessions(prev => prev.filter(x => x !== s));
                      if (selected === s) {
                        setSelected('');
                        setMessages([]);
                        if (onSelectSession) onSelectSession('');
                      }
                    } catch (err) {
                      console.error('Failed to delete session:', err);
                      alert('Failed to delete session');
                    }
                  }}
                  aria-label={`Delete session ${s}`}
                  title="Delete session"
                  className="ml-2 p-2 rounded text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

export default ChatInterface;
