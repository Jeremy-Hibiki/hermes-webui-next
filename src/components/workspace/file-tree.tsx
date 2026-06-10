'use client';

import { Folder, ChevronRight, Image, FileText, FileCode, Zap, Settings, Terminal, Download, X } from 'lucide-react';
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
  expanded: Set<string>;
  dirCache: Record<string, FileEntry[]>;
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

  return (
    <>
      <button
        type="button"
        className="group/file flex items-center gap-[6px] rounded-lg cursor-pointer text-[12px] text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)] transition-all min-w-0"
        style={{ padding: '6px 10px 6px 0', marginLeft: `${8 + d * 16}px` }}
        onClick={() => {
          if (isDir) {
            props.onDirToggle(entry.path);
          } else {
            props.onFileSelect(entry.path);
          }
        }}
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
        <span className="flex-1 truncate min-w-0">{entry.name}</span>
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

      {isDir &&
        isExpanded &&
        (() => {
          const children = props.dirCache[entry.path] || [];
          const visible = children.filter((c) => !shouldHide(c.name));
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

function FileTreeItems({ entries, depth = 0, ...props }: FileTreeProps) {
  return (
    <>
      {entries
        .filter((e) => !shouldHide(e.name))
        .map((entry) => (
          <TreeRow key={entry.path} entry={entry} depth={depth} {...props} />
        ))}
    </>
  );
}

export function FileTree({ entries, depth = 0, ...rest }: FileTreeProps) {
  const visible = entries.filter((e) => !shouldHide(e.name));
  if (visible.length === 0 && depth === 0) {
    return <div className="p-4 text-sm text-[var(--muted)] text-center">Empty directory</div>;
  }
  return (
    <div className="p-2">
      <FileTreeItems entries={visible} depth={depth} {...rest} />
    </div>
  );
}
