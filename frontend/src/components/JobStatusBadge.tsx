import { DocumentStatus } from '../types';

interface JobStatusBadgeProps {
  status: DocumentStatus;
}

const colors: Record<DocumentStatus, string> = {
  queued: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export default function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {status === 'processing' && (
        <span className="w-2 h-2 mr-1.5 bg-blue-500 rounded-full animate-pulse" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
