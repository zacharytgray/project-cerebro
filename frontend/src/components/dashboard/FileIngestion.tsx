import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function FileIngestion() {
  const [dragActive, setDragActive] = useState(false);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    console.log('Files to upload:', files);
    // TODO: Implement file upload to backend
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-400" />
        File Ingestion
      </h2>
      
      <form
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className="relative"
      >
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        
        <label
          htmlFor="file-upload"
          className={`
            flex flex-col items-center justify-center
            border-2 border-dashed rounded-lg p-8
            cursor-pointer transition-all duration-200
            ${
              dragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-border hover:border-blue-500/50 hover:bg-blue-500/5'
            }
          `}
        >
          <Upload className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, TXT, MD, or ZIP files
          </p>
        </label>
      </form>
      
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1">
          Recent Uploads
        </Button>
        <Button variant="ghost" size="sm">
          Settings
        </Button>
      </div>
    </Card>
  );
}
