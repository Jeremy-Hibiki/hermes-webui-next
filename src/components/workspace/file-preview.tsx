'use client';

import { X } from 'lucide-react';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';

interface FilePreviewProps {
  path: string;
  content: string;
  sessionId: string;
  onClose?: () => void;
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi'];
const PDF_EXTS = ['.pdf'];
const HTML_EXTS = ['.html', '.htm'];
const MD_EXTS = ['.md', '.markdown'];

function getExt(path: string): string {
  const idx = path.lastIndexOf('.');
  return idx >= 0 ? path.slice(idx).toLowerCase() : '';
}

function rawUrl(sessionId: string, path: string): string {
  return `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/file/raw?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}&inline=1`;
}

export function FilePreview({ path, content, sessionId, onClose }: FilePreviewProps) {
  const ext = getExt(path);
  const filename = path.split('/').pop() || path;

  if (IMAGE_EXTS.includes(ext)) {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/file?path=${encodeURIComponent(path)}`} alt={path} className="max-w-full rounded" />
      </div>
    );
  }

  if (AUDIO_EXTS.includes(ext)) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <span className="text-xs text-[var(--muted)] truncate">{filename}</span>
          {onClose && (
            <button onClick={onClose} aria-label="Close preview" className="p-1 rounded hover:bg-[var(--hover-bg)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <audio controls preload="metadata" className="w-full max-w-md">
            <source src={rawUrl(sessionId, path)} />
          </audio>
        </div>
      </div>
    );
  }

  if (VIDEO_EXTS.includes(ext)) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <span className="text-xs text-[var(--muted)] truncate">{filename}</span>
          {onClose && (
            <button onClick={onClose} aria-label="Close preview" className="p-1 rounded hover:bg-[var(--hover-bg)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-2">
          <video controls preload="metadata" className="max-w-full max-h-full rounded">
            <source src={rawUrl(sessionId, path)} />
          </video>
        </div>
      </div>
    );
  }

  if (PDF_EXTS.includes(ext)) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <span className="text-xs text-[var(--muted)] truncate">{filename}</span>
          <div className="flex items-center gap-1">
            <a
              href={rawUrl(sessionId, path)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--accent)] hover:underline px-2"
            >
              Open
            </a>
            {onClose && (
              <button onClick={onClose} aria-label="Close preview" className="p-1 rounded hover:bg-[var(--hover-bg)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <iframe src={rawUrl(sessionId, path)} title={`PDF preview: ${filename}`} className="flex-1 w-full border-0" />
      </div>
    );
  }

  if (HTML_EXTS.includes(ext)) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <span className="text-xs text-[var(--muted)] truncate">{filename}</span>
          <div className="flex items-center gap-1">
            <a
              href={rawUrl(sessionId, path)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--accent)] hover:underline px-2"
            >
              Open
            </a>
            {onClose && (
              <button onClick={onClose} aria-label="Close preview" className="p-1 rounded hover:bg-[var(--hover-bg)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <iframe
          src={rawUrl(sessionId, path)}
          title={`HTML preview: ${filename}`}
          className="flex-1 w-full border-0 bg-white"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    );
  }

  if (MD_EXTS.includes(ext)) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <span className="text-xs text-[var(--muted)] truncate">{filename}</span>
          {onClose && (
            <button onClick={onClose} aria-label="Close preview" className="p-1 rounded hover:bg-[var(--hover-bg)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4 text-sm">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    );
  }

  // Default: plain text / code
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted)] truncate">{filename}</span>
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
