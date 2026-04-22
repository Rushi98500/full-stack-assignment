import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, RefreshCw } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import ExportButtons from '../components/ExportButtons';
import { documentsApi } from '../api/client';
import type { Document, ExtractedResult } from '../types';

const stageLabels: Record<string, string> = {
  job_queued: 'Job queued',
  job_started: 'Job started',
  document_parsing_started: 'Parsing started',
  document_parsing_completed: 'Parsing complete',
  field_extraction_started: 'Extracting fields',
  field_extraction_completed: 'Fields extracted',
  result_stored: 'Storing results',
  job_completed: 'Processing complete',
  job_failed: 'Processing failed',
};

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState<ExtractedResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchDocument = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await documentsApi.get(id);
      setDocument(response.data);
      setEditedData(response.data.reviewed_result || response.data.raw_result || null);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [id]);

  useEffect(() => {
    if (!id || !document || document.status === 'completed' || document.status === 'failed') return;

    const apiUrl = 'http://localhost:8000';
    const eventSource = new EventSource(`${apiUrl}/api/documents/${id}/progress`);

    eventSource.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setDocument(prev => prev ? { ...prev, progress: data.progress, current_stage: data.stage } : null);
      
      if (data.stage === 'job_completed' || data.stage === 'job_failed') {
        eventSource.close();
        fetchDocument();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id, document?.status]);

  const handleSave = async () => {
    if (!id || !editedData) return;
    try {
      setSaving(true);
      await documentsApi.updateReview(id, editedData as unknown as Record<string, unknown>);
      await fetchDocument();
      showToast('Changes saved', 'success');
    } catch (error) {
      console.error('Failed to save review:', error);
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!id || !document) return;
    if (!confirm('Are you sure? This cannot be undone.')) return;
    
    try {
      setFinalizing(true);
      await documentsApi.finalize(id);
      await fetchDocument();
      showToast('Document finalized', 'success');
    } catch (error) {
      console.error('Failed to finalize:', error);
      showToast('Failed to finalize. Please try again.', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    try {
      await documentsApi.retry(id);
      await fetchDocument();
      showToast('Document queued for retry', 'success');
    } catch (error) {
      console.error('Failed to retry:', error);
      showToast('Failed to retry. Please try again.', 'error');
    }
  };

  const handleFieldChange = (field: keyof ExtractedResult, value: any) => {
    setEditedData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStageIndex = () => {
    const stages = Object.keys(stageLabels);
    if (!document) return -1;
    return stages.indexOf(document.current_stage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Document not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{document.original_name}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>Size: {formatFileSize(document.file_size)}</span>
                  <span>Type: {document.file_type}</span>
                  <span>Uploaded: {formatDate(document.created_at)}</span>
                  <span>Retry count: {document.retry_count}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {(document.status === 'queued' || document.status === 'processing') && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">Processing Progress</h2>
                <ProgressBar progress={document.progress} stage={document.current_stage} status={document.status} />
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Stage Timeline</h3>
                  <div className="space-y-2">
                    {Object.entries(stageLabels).map(([stage, label], index) => {
                      const currentIndex = getStageIndex();
                      const status = index < currentIndex ? 'complete' : index === currentIndex ? 'active' : 'pending';
                      return (
                        <div key={stage} className="flex items-center space-x-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${
                            status === 'complete' ? 'bg-green-500' : 
                            status === 'active' ? 'bg-blue-500 animate-pulse' : 
                            'bg-gray-300'
                          }`} />
                          <span className={
                            status === 'complete' ? 'text-gray-900' : 
                            status === 'active' ? 'text-blue-600 font-medium' : 
                            'text-gray-400'
                          }>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {document.status === 'completed' && editedData && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Extracted Data</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editedData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      disabled={document.is_finalized}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={editedData.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      disabled={document.is_finalized}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                    <textarea
                      value={editedData.summary}
                      onChange={(e) => handleFieldChange('summary', e.target.value)}
                      rows={4}
                      disabled={document.is_finalized}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                    <input
                      type="text"
                      value={editedData.keywords.join(', ')}
                      onChange={(e) => handleFieldChange('keywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                      disabled={document.is_finalized}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <input
                      type="text"
                      value={editedData.language}
                      onChange={(e) => handleFieldChange('language', e.target.value)}
                      disabled={document.is_finalized}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
                      <input
                        type="text"
                        value={editedData.extraction_confidence.toFixed(2)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Word count</label>
                      <input
                        type="text"
                        value={editedData.word_count}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page count</label>
                    <input
                      type="text"
                      value={editedData.page_count}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    onClick={handleSave}
                    disabled={document.is_finalized || saving}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  
                  <button
                    onClick={handleFinalize}
                    disabled={document.is_finalized || finalizing}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {finalizing ? 'Finalizing...' : 'Finalize'}
                  </button>

                  <ExportButtons documentId={document.id} disabled={document.is_finalized} />
                </div>

                {document.is_finalized && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <span className="flex items-center text-green-700 text-sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Finalized
                    </span>
                  </div>
                )}
              </div>
            )}

            {document.status === 'failed' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Error Details</h2>
                <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                  <p className="text-sm text-red-700">{document.error_message || 'An unknown error occurred'}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Processing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
