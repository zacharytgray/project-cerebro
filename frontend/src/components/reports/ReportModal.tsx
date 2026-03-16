import { Download, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Report } from '../../api/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ReportModalProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ report, isOpen, onClose }: ReportModalProps) {
  if (!report) return null;

  const filename = `${report.date ?? 'report'}-${report.kind ?? 'report'}.md`;

  const handleDownload = () => {
    const blob = new Blob([report.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${report.date} · ${report.kind}`} className="max-w-5xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/45 dark:border-white/10 bg-white/45 dark:bg-white/5 px-4 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{filename}</div>
            <div className="text-xs text-muted-foreground truncate">
              Last updated {new Date(report.mtime).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownload} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/45 dark:border-white/10 bg-white/45 dark:bg-white/5 backdrop-blur-md p-5 max-h-[70vh] overflow-y-auto">
          <div className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </Modal>
  );
}
