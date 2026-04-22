import { Download } from 'lucide-react';
import { documentsApi } from '../api/client';

interface ExportButtonsProps {
  documentId: string;
  disabled?: boolean;
}

export default function ExportButtons({ documentId, disabled }: ExportButtonsProps) {
  const handleExport = (format: 'json' | 'csv') => {
    window.open(documentsApi.exportUrl(documentId, format), '_blank');
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => handleExport('json')}
        disabled={disabled}
        className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <Download className="h-4 w-4 mr-1" />
        JSON
      </button>
      <button
        onClick={() => handleExport('csv')}
        disabled={disabled}
        className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <Download className="h-4 w-4 mr-1" />
        CSV
      </button>
    </div>
  );
}
