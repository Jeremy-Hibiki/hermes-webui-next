'use client';

import {
  Folder,
  ChevronRight,
  Image,
  FileText,
  FileCode,
  Zap,
  Settings,
  Terminal,
  Download,
  X,
  Pencil,
  ClipboardCopy,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { FileEntry } from '@/types';

const HIDDEN_NAMES = new Set([
  '.DS_Store',
  '._.DS_Store',
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  '__pycache__',
  'Thumbs.db',
  'Desktop.ini',
  '.directory',
  '.AppleDouble',
  '.Spotlight-V100',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.tox',
  '.venv',
  'venv',
  'ehthumbs.db',
  '$RECYCLE.BIN',
  '.Trashes',
  '.fseventsd',
  '.gitignore',
  '.env',
  '.idea',
  '.vscode',
]);

function shouldHide(name: string): boolean {
  if (HIDDEN_NAMES.has(name)) return true;
  if (name.startsWith('._') || name.startsWith('.Trash-')) return true;
  return false;
}

function fileIcon(name: string, isDir: boolean) {
  if (isDir) return <Folder className="w-[14px] h-[14px] text-[var(--accent)] shrink-0" />;
  const ext = name.includes('.') ? '.' + name.split('.').pop()!.toLowerCase() : '';
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'].includes(ext))
    return <Image className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" />;
  if (['.md', '.txt', '.rst', '.log'].includes(ext))
    return <FileText className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" />;
  if (['.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h'].includes(ext))
    return <FileCode className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" />;
  if (['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext))
    return <Zap className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" />;
  if (['.json', '.yaml', '.yml', '.toml', '.ini'].includes(ext))
    return <Settings className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" />;
  if (['.sh', '.bash', '.zsh'].includes(ext))
    return <Terminal className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" />;
  if (['.pdf', '.zip', '.tar', '.gz'].includes(ext))
    return <Download className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" />;
  return <FileText className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" />;
}

interface FileTreeProps {
  entries: FileEntry[];
  onFileSelect: (path: string) => void;
  onDirToggle: (path: string) => void;
  onDelete?: (path: string, name: string, isDir: boolean) => void;
  onRename?: (path: string, name: string) => void;
  onDownload?: (path: string, name: string) => void;
  expanded: Set<string>;
  dirCache: Record<string, FileEntry[]>;
  showHidden?: boolean;
  depth?: number;
}

function TreeRow({
  entry,
  depth,
  ...props
}: { entry: FileEntry; depth: number } & Omit<FileTreeProps, 'entries' | 'depth'>) {
  const isDir = entry.type === 'dir';
  const isExpanded = props.expanded.has(entry.path);
  const d = depth ?? 0;
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(entry.name);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      const dotIdx = entry.name.lastIndexOf('.');
      renameRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : entry.name.length);
    }
  }, [renaming, entry.name]);

  const submitRename = useCallback(() => {
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== entry.name && props.onRename) {
      props.onRename(entry.path, trimmed);
    }
    setRenaming(false);
  }, [renameVal, entry.name, entry.path, props]);

  const handleCtx = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [ctxMenu]);

  return (
    <>
      <button
        type="button"
        className="group/file flex items-center gap-[6px] rounded-lg cursor-pointer text-[12px] text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)] transition-all min-w-0"
        style={{ padding: '6px 10px 6px 0', marginLeft: `${8 + d * 16}px` }}
        onClick={() => {
          if (renaming) return;
          if (isDir) {
            props.onDirToggle(entry.path);
          } else {
            props.onFileSelect(entry.path);
          }
        }}
        onDoubleClick={() => {
          if (props.onRename) setRenaming(true);
        }}
        onContextMenu={handleCtx}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isDir) {
              props.onDirToggle(entry.path);
            } else {
              props.onFileSelect(entry.path);
            }
          }
        }}
      >
        {isDir ? (
          <ChevronRight
            className={cn(
              'w-[10px] h-[10px] shrink-0 text-[var(--muted)] transition-transform',
              isExpanded && 'rotate-90',
            )}
          />
        ) : (
          <span className="inline-block shrink-0 w-[10px]" aria-hidden />
        )}
        {fileIcon(entry.name, isDir)}
        {renaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            className="flex-1 min-w-0 bg-[var(--input-bg)] border border-[var(--accent)] rounded px-1 text-[var(--text)] text-[12px] outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate min-w-0">{entry.name}</span>
        )}
        {!isDir && entry.size != null && entry.size > 0 && (
          <span className="text-[10px] text-[var(--muted)] opacity-60 shrink-0">{(entry.size / 1024).toFixed(1)}k</span>
        )}
        {props.onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              props.onDelete!(entry.path, entry.name, isDir);
            }}
            className="shrink-0 w-0 overflow-hidden opacity-0 group-hover/file:w-4 group-hover/file:opacity-100 transition-all text-[var(--muted)] hover:text-[var(--accent)]"
            aria-label="Delete"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[160px] text-[12px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          {props.onRename && (
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[var(--text)] hover:bg-[var(--hover-bg)]"
              onClick={() => {
                setCtxMenu(null);
                setRenaming(true);
              }}
            >
              <Pencil className="w-3 h-3" /> Rename
            </button>
          )}
          {!isDir && props.onDownload && (
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[var(--text)] hover:bg-[var(--hover-bg)]"
              onClick={() => {
                setCtxMenu(null);
                props.onDownload!(entry.path, entry.name);
              }}
            >
              <Download className="w-3 h-3" /> Download
            </button>
          )}
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[var(--text)] hover:bg-[var(--hover-bg)]"
            onClick={() => {
              setCtxMenu(null);
              navigator.clipboard.writeText(entry.path);
            }}
          >
            <ClipboardCopy className="w-3 h-3" /> Copy path
          </button>
          {props.onDelete && (
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[var(--error)] hover:bg-[var(--hover-bg)]"
              onClick={() => {
                setCtxMenu(null);
                props.onDelete!(entry.path, entry.name, isDir);
              }}
            >
              <X className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      )}

      {isDir &&
        isExpanded &&
        (() => {
          const children = props.dirCache[entry.path] || [];
          const visible = props.showHidden ? children : children.filter((c) => !shouldHide(c.name));
          if (visible.length === 0) {
            return (
              <div
                className="text-[var(--muted)] opacity-50 italic text-[11px] cursor-default py-1.5"
                style={{ marginLeft: `${8 + (d + 1) * 16}px` }}
              >
                Empty
              </div>
            );
          }
          return <FileTreeItems entries={visible} depth={d + 1} {...props} />;
        })()}
    </>
  );
}

function FileTreeItems({ entries, depth = 0, showHidden, ...props }: FileTreeProps) {
  const visible = showHidden ? entries : entries.filter((e) => !shouldHide(e.name));
  return (
    <>
      {visible.map((entry) => (
        <TreeRow key={entry.path} entry={entry} depth={depth} showHidden={showHidden} {...props} />
      ))}
    </>
  );
}

export function FileTree({ entries, depth = 0, showHidden, ...rest }: FileTreeProps) {
  const visible = showHidden ? entries : entries.filter((e) => !shouldHide(e.name));
  const [isDragOver, setIsDragOver] = useState(false);

  if (visible.length === 0 && depth === 0) {
    return <div className="p-4 text-sm text-[var(--muted)] text-center">Empty directory</div>;
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're actually leaving the container (not entering a child)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  return (
    <div
      className={cn(
        'p-2 rounded-lg transition-colors',
        isDragOver && 'bg-[var(--accent-bg)] border-2 border-dashed border-[var(--accent)]',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <FileTreeItems entries={visible} depth={depth} showHidden={showHidden} {...rest} />
    </div>
  );
}
