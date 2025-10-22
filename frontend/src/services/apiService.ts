import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const apiService = {
  async setupApiKey(apiKey: string): Promise<void> {
    // setupApiKey removed: API key management is handled server-side and not via client calls
    return Promise.resolve();
  },

  async uploadFiles(files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async sendMessage(message: string, sessionId?: string, selectedDocuments?: string[]): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/api/chat`, {
      message,
      session_id: sessionId,
      selected_documents: selectedDocuments || []
    });
    return response.data;
  },

  async getChatHistory(sessionId: string): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/chat/history/${sessionId}`);
    return response.data;
  },

  async clearChatHistory(sessionId: string): Promise<any> {
    const response = await axios.delete(`${API_BASE_URL}/api/chat/history/${sessionId}`);
    return response.data;
  },

  async deleteChatSession(sessionId: string): Promise<any> {
    return this.clearChatHistory(sessionId);
  },

  async listDocuments(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/documents`);
    return response.data;
  },

  async listChatSessions(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/chat/sessions`);
    return response.data;
  },

  async getDocumentContent(filename: string): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/documents/content/${encodeURIComponent(filename)}`);
    return response.data;
  },

  async setSelectedDocuments(sessionId: string, selectedDocuments: string[]): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/api/chat/selected_documents`, {
      session_id: sessionId,
      selected_documents: selectedDocuments
    });
    return response.data;
  },

  async deleteDocument(documentId: string): Promise<any> {
    const response = await axios.delete(`${API_BASE_URL}/api/documents/${documentId}`);
    return response.data;
  }
};
