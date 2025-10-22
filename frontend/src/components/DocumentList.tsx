import React, { useState, useEffect } from 'react';
import { FileText, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

interface Document {
  filename: string;
  chunks: number;
  total_chunks: number;
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await apiService.listDocuments();
      setDocuments(response.documents || []);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      setError('Failed to load documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(filename);
      await apiService.deleteDocument(filename);
      setDocuments(prev => prev.filter(doc => doc.filename !== filename));
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'html':
      case 'htm':
        return '🌐';
      case 'txt':
        return '📝';
      case 'md':
        return '📋';
      default:
        return '📁';
    }
  };

  const formatFileSize = (chunks: number, totalChunks: number) => {
    // Rough estimation based on chunks
    const estimatedSize = chunks * 1000; // Assuming ~1KB per chunk
    if (estimatedSize < 1024) return `${estimatedSize} B`;
    if (estimatedSize < 1024 * 1024) return `${(estimatedSize / 1024).toFixed(1)} KB`;
    return `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
          <span className="text-gray-600">Loading documents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Knowledge Base</h2>
          <p className="text-gray-600 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} in your knowledge base
          </p>
        </div>
        <button
          onClick={loadDocuments}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-600 mb-4">
            Upload some documents to build your knowledge base.
          </p>
          <div className="text-sm text-gray-500">
            Supported formats: PDF, HTML, TXT, Markdown
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl">{getFileIcon(doc.filename)}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{doc.filename}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{doc.chunks} chunks</span>
                    <span>•</span>
                    <span>{formatFileSize(doc.chunks, doc.total_chunks)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteDocument(doc.filename)}
                disabled={isDeleting === doc.filename}
                className="flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting === doc.filename ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Information */}
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-gray-900 mb-2">About your knowledge base</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Documents are automatically split into chunks for better search</li>
              <li>• The chatbot uses semantic search to find relevant information</li>
              <li>• Each document is processed and indexed when uploaded</li>
              <li>• Deleted documents are permanently removed from the knowledge base</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentList;
