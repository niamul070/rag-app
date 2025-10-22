import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

interface UploadResult {
  filename: string;
  status: 'success' | 'error';
  message: string;
}

const FileUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadResults([]);

    try {
      const results = await apiService.uploadFiles(acceptedFiles);
      setUploadResults(results.results || []);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadResults([
        {
          filename: 'Upload failed',
          status: 'error',
          message: error.response?.data?.detail || 'Failed to upload files'
        }
      ]);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/html': ['.html', '.htm'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Documents</h2>
        <p className="text-gray-600">
          Upload PDF, HTML, TXT, or Markdown files to add them to your knowledge base.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to select files
            </p>
          </div>
          <div className="text-xs text-gray-400">
            Supports: PDF, HTML, TXT, MD • Max 10MB per file
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800">Processing files...</span>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Upload Results</h3>
          {uploadResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                result.status === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {result.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{getFileIcon(result.filename)}</span>
                    <span className="font-medium text-gray-900">{result.filename}</span>
                  </div>
                  <p
                    className={`text-sm mt-1 ${
                      result.status === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Tips for best results:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Upload documents with clear, well-structured text</li>
              <li>• PDF files should have selectable text (not scanned images)</li>
              <li>• HTML files should contain readable content</li>
              <li>• Markdown files will be processed with formatting preserved</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
