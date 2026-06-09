'use client';

import { Folder, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileEntry } from '@/types';

interface FileTreeProps {
  entries: FileEntry[];
  onFileSelect: (path: string) => void;
  onDirToggle: (path: string) => void;
  expanded?: Set<string>;
  depth?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileTree({ entries, onFileSelect, onDirToggle, expanded = new Set(), depth = 0 }: FileTreeProps) {
  if (entries.length === 0 && depth === 0) {
    return <div className="p-4 text-sm text-[var(--muted)] text-center">Empty directory</div>;
  }

  return (
    <div className="text-sm">
      {entries.map((entry) => (
        <div key={entry.path}>
          <button
            onClick={() => (entry.is_dir ? onDirToggle(entry.path) : onFileSelect(entry.path))}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--hover-bg)] transition-colors text-left',
              'text-[var(--text)]',
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {entry.is_dir ? (
              <Folder className="w-4 h-4 text-[var(--accent)] shrink-0" />
            ) : (
              <File className="w-4 h-4 text-[var(--muted)] shrink-0" />
            )}
            <span className="truncate flex-1">{entry.name}</span>
            {!entry.is_dir && entry.size != null && (
              <span className="text-xs text-[var(--muted)] shrink-0">{formatSize(entry.size)}</span>
            )}
          </button>
          {entry.is_dir && expanded.has(entry.path) && entry.children && (
            <FileTree
              entries={entry.children}
              onFileSelect={onFileSelect}
              onDirToggle={onDirToggle}
              expanded={expanded}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}
