import React, { useCallback } from 'react';
import { Upload, Music, Film } from 'lucide-react';

interface MediaUploadProps {
  type: 'audio' | 'video';
  file: File | null;
  onFileSelect: (file: File) => void;
}

const MediaUpload: React.FC<MediaUploadProps> = ({ type, file, onFileSelect }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) onFileSelect(droppedFile);
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) onFileSelect(selectedFile);
  }, [onFileSelect]);

  const accept = type === 'audio' ? 'audio/*' : 'video/*';
  const Icon = type === 'audio' ? Music : Film;
  const label = type === 'audio' ? 'Instrumental Audio' : 'Background Video';

  return (
    <label
      className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-dashed border-border hover:border-primary/50 bg-editor-surface hover:bg-editor-surface-hover transition-colors cursor-pointer group touch-manipulation"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      {file ? (
        <span className="text-xs font-medium text-foreground truncate max-w-[80px] sm:max-w-[120px]">{file.name}</span>
      ) : (
        <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
      )}
    </label>
  );
};

export default MediaUpload;
