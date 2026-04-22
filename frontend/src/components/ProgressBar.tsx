interface ProgressBarProps {
  progress: number;
  stage?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
}

const stageLabels: Record<string, string> = {
  job_queued: 'Waiting in queue...',
  job_started: 'Job started',
  document_parsing_started: 'Parsing document...',
  document_parsing_completed: 'Parsing complete',
  field_extraction_started: 'Extracting fields...',
  field_extraction_completed: 'Fields extracted',
  result_stored: 'Storing results...',
  job_completed: 'Processing complete',
  job_failed: 'Processing failed',
};

export default function ProgressBar({ progress, stage, status = 'processing' }: ProgressBarProps) {
  const getBarColor = () => {
    if (status === 'failed') return 'bg-red-500';
    if (progress === 100) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
        <div
          className={`${getBarColor()} h-2.5 rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {stage && (
        <div className="text-xs text-gray-600">
          {stageLabels[stage] || stage}
        </div>
      )}
    </div>
  );
}
