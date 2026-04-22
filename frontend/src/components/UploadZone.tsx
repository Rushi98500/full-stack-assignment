import { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import type { Document } from '../types';

interface UploadZoneProps {
  onSuccess: (documents: Document[]) => void;
}

const SUPPORTED_TYPES = ['.txt', '.pdf', '.docx', '.csv', '.md'];

export default function UploadZone({ onSuccess }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file => 
        SUPPORTED_TYPES.some(ext => file.name.toLowerCase().endsWith(ext))
      );
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(file =>
        SUPPORTED_TYPES.some(ext => file.name.toLowerCase().endsWith(ext))
      );
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setUploadProgress({});
    
    try {
      const { documentsApi } = await import('../api/client');
      
      const response = await documentsApi.upload(selectedFiles, (progress) => {
        setUploadProgress(prev => ({ ...prev, global: progress }));
      });
      
      onSuccess(response.data);
      setSelectedFiles([]);
      setUploadProgress({});
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 border-solid bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drag and drop files here, or click to select
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports: .txt, .pdf, .docx, .csv, .md
        </p>
        <input
          type="file"
          multiple
          accept={SUPPORTED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
          disabled={uploading}
        />
        <label
          htmlFor="file-input"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Select Files'}
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Selected Files:</h3>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex flex-col p-3 bg-gray-50 rounded-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  disabled={uploading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {uploading && uploadProgress.global !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.global}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{uploadProgress.global}%</p>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-3 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
