import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, RefreshCw } from 'lucide-react';
import UploadZone from '../components/UploadZone';
import JobStatusBadge from '../components/JobStatusBadge';
import ProgressBar from '../components/ProgressBar';
import ExportButtons from '../components/ExportButtons';
import { documentsApi } from '../api/client';
import type { Document } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        page_size: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await documentsApi.list(params);
      setDocuments(response.data?.documents || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, statusFilter, search]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const hasProcessingDocs = documents.some(d => d.status === 'queued' || d.status === 'processing');
    if (!hasProcessingDocs) return;

    const timer = setInterval(() => {
      fetchDocuments();
    }, 5000);
    return () => clearInterval(timer);
  }, [documents, fetchDocuments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUploadSuccess = (newDocs: Document[]) => {
    setDocuments(prev => [...newDocs, ...prev]);
    setTotal(prev => prev + newDocs.length);
    showToast('Document(s) uploaded successfully', 'success');
  };

  const handleRetry = async (id: string) => {
    try {
      await documentsApi.retry(id);
      await fetchDocuments();
      showToast('Document queued for retry', 'success');
    } catch (error) {
      console.error('Retry failed:', error);
      showToast('Retry failed. Please try again.', 'error');
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Async Document Processor</h1>
        </div>

        <div className="mb-6">
          <UploadZone onSuccess={handleUploadSuccess} />
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <button
                onClick={fetchDocuments}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="queued">Queued</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-');
                  setSortBy(by);
                  setSortOrder(order as 'asc' | 'desc');
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="filename-asc">Name A-Z</option>
                <option value="filename-desc">Name Z-A</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></td>
                      <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded animate-pulse w-16" /></td>
                      <td className="px-6 py-4"><div className="h-2 bg-gray-200 rounded animate-pulse w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>
                      <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded animate-pulse w-20" /></td>
                    </tr>
                  ))
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No documents yet. Upload a file to get started.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {doc.original_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(doc.file_size)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <JobStatusBadge status={doc.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap w-48">
                        <ProgressBar progress={doc.progress} stage={doc.current_stage} status={doc.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="text-blue-500 hover:text-blue-700"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {doc.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(doc.id)}
                              className="text-orange-500 hover:text-orange-700"
                              title="Retry"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          {doc.status === 'completed' && (
                            <ExportButtons documentId={doc.id} disabled={false} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Showing {documents.length} of {total} documents
            </span>
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
