'use client';

import { X } from 'lucide-react';

interface FilePreviewProps {
  path: string;
  content: string;
  onClose?: () => void;
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];

function isImage(path: string): boolean {
  return IMAGE_EXTS.some((ext) => path.toLowerCase().endsWith(ext));
}

export function FilePreview({ path, content, onClose }: FilePreviewProps) {
  if (isImage(path)) {
    return (
      <div className="relative p-2">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--hover-bg)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <img src={`/api/file?path=${encodeURIComponent(path)}`} alt={path} className="max-w-full rounded" />
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted)] truncate">{path}</span>
        {onClose && (
          <button onClick={onClose} aria-label="Close preview" className="p-1 rounded hover:bg-[var(--hover-bg)]">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-[var(--code-text)] bg-[var(--code-bg)]">
        {content}
      </pre>
    </div>
  );
}
