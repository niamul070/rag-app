import React, { useState, useEffect } from 'react';
import { MessageCircle, Upload, Settings, FileText, Trash2 } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import FileUpload from './components/FileUpload';
// ApiKeySetup removed: server manages API key
import DocumentList from './components/DocumentList';
import { apiService } from './services/apiService';

interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'upload' | 'documents'>('chat');
  const [sessionId, setSessionId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Generate a new session ID
    setSessionId(generateSessionId());
  }, []);

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // API key setup is now server-side only

  const handleNewChat = () => {
    setSessionId(generateSessionId());
    setChatHistory([]);
    // Clear any selected previous session so the UI switches to the new chat
    setSelectedSessionId('');
  };

  const handleMessageSent = (message: string) => {
    setChatHistory(prev => [...prev, {
      role: 'user',
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleResponseReceived = (response: string) => {
    setChatHistory(prev => [...prev, {
      role: 'assistant',
      message: response,
      timestamp: new Date().toISOString()
    }]);
  };

  // No client-side API key prompt; render the app normally

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MessageCircle className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">RAG Chatbot</h1>
            </div>
            <button
              onClick={handleNewChat}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              New Chat
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'chat'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload Documents
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Knowledge Base
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'chat' && (
            <ChatInterface
              sessionId={selectedSessionId || sessionId}
              onMessageSent={handleMessageSent}
              onResponseReceived={handleResponseReceived}
              onSelectSession={setSelectedSessionId}
            />
          )}
          {activeTab === 'upload' && <FileUpload />}
          {activeTab === 'documents' && <DocumentList />}
        </div>
      </div>
    </div>
  );
}

export default App;