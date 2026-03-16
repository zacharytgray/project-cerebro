import { useState } from 'react';
import { Card } from '../ui/Card';
import type { Report } from '../../api/types';
import { Skeleton } from '../ui/Skeleton';
import { ReportModal } from './ReportModal';

interface ReportViewerProps {
  reports: Report[];
  loading: boolean;
  onRefresh: () => void;
}

export function ReportViewer({ reports, loading, onRefresh }: ReportViewerProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <>
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Recent Reports</h2>
        <button
          onClick={onRefresh}
          className="text-xs text-blue-300 hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <p className="text-xs text-muted-foreground">No reports found.</p>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {reports.map((r) => (
          <button
            key={`${r.date}-${r.kind}-${r.mtime}`}
            onClick={() => setSelectedReport(r)}
            className="w-full text-left rounded-2xl border border-white/45 dark:border-white/10 bg-white/45 dark:bg-white/5 px-4 py-3 backdrop-blur-md hover:bg-white/65 dark:hover:bg-white/10 transition-colors"
          >
            <div className="text-sm font-medium truncate">{r.date || 'Unknown date'} · {r.kind || 'report'}</div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {new Date(r.mtime).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </Card>
    <ReportModal report={selectedReport} isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} />
    </>
  );
}
