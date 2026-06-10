'use client';

import { useAtom } from 'jotai';
import { activeSessionAtom } from '@/atoms/session';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FolderOpen, RefreshCw, Plus, Trash2, Home, GitBranch, FileText } from 'lucide-react';
import { FileTree } from '@/components/workspace/file-tree';
import { FilePreview } from '@/components/workspace/file-preview';
import { GitBadge } from '@/components/workspace/git-badge';
import { GitOperations } from '@/components/workspace/git-operations';
import { ArtifactList } from '@/components/workspace/artifact-list';
import { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { API_BASE } from '@/lib/constants';
import type { WorkspaceInfo, GitStatus, FileEntry } from '@/types';
import { cn } from '@/lib/utils';

export function WorkspacePanel() {
  const [activeSession] = useAtom(activeSessionAtom);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [dirCache, setDirCache] = useState<Record<string, FileEntry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('hermes-expanded-dirs');
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [addPath, setAddPath] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'artifacts' | 'git'>('files');

  const sessionId = activeSession?.session_id ?? '';
  const workspace = activeSession?.workspace ?? '';

  const { data: gitData } = useSWR<{ git: GitStatus }>(
    sessionId ? `/git-info?session_id=${sessionId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: workspacesData, mutate: mutateWorkspaces } = useSWR<{ workspaces: WorkspaceInfo[] }>(
    '/workspaces',
    fetcher,
    { revalidateOnFocus: false },
  );
  const workspaces = workspacesData?.workspaces ?? [];

  const fetchDir = useCallback(
    async (dir: string) => {
      if (!sessionId) return [];
      try {
        const res = await fetch(
          `${API_BASE}/list?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(dir)}`,
          { credentials: 'include' },
        );
        if (!res.ok) return [];
        const data = await res.json();
        const entries: FileEntry[] = Array.isArray(data) ? data : (data.entries ?? []);
        // Sort: dirs first, then files, alphabetically
        entries.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return entries;
      } catch {
        return [];
      }
    },
    [sessionId],
  );

  // Fetch root on mount
  useEffect(() => {
    if (workspace) {
      setLoading(true);
      fetchDir(workspace).then((entries) => {
        setRootEntries(entries);
        setDirCache((prev) => ({ ...prev, [workspace]: entries }));
        setCurrentPath(workspace);
        setLoading(false);
      });
    }
  }, [workspace, fetchDir]);

  const handleDirToggle = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          // Lazy-load children
          if (!dirCache[path]) {
            void fetchDir(path).then((entries) => {
              setDirCache((c) => ({ ...c, [path]: entries }));
            });
          }
        }
        try {
          localStorage.setItem('hermes-expanded-dirs', JSON.stringify([...next]));
        } catch {}
        return next;
      });
    },
    [dirCache, fetchDir],
  );

  const handleFileSelect = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      if (!sessionId) return;
      try {
        const res = await fetch(
          `${API_BASE}/file?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`,
          { credentials: 'include' },
        );
        if (!res.ok) return;
        const data = await res.json();
        setFileContent(data.content ?? String(data));
      } catch {
        setFileContent('');
      }
    },
    [sessionId],
  );

  const handleDelete = useCallback(
    async (path: string, name: string, _isDir: boolean) => {
      if (!window.confirm(`Delete "${name}"?`)) return;
      try {
        await apiPost('/file/delete', { session_id: sessionId, path });
        // Refresh the parent directory
        setDirCache((prev) => {
          const next = { ...prev };
          // Find and refresh the parent
          for (const key of Object.keys(next)) {
            if (path.startsWith(key)) {
              void fetchDir(key).then((entries) => {
                setDirCache((c) => ({ ...c, [key]: entries }));
              });
            }
          }
          return next;
        });
        if (workspace) {
          const entries = await fetchDir(workspace);
          setRootEntries(entries);
          setDirCache((prev) => ({ ...prev, [workspace]: entries }));
        }
      } catch (err) {
        console.error('Delete failed:', err);
      }
    },
    [sessionId, workspace, fetchDir],
  );

  const handleBreadcrumb = useCallback(
    (path: string) => {
      setCurrentPath(path);
      setSelectedFile(null);
      void fetchDir(path).then((entries) => {
        setRootEntries(entries);
        setDirCache((prev) => ({ ...prev, [path]: entries }));
      });
    },
    [fetchDir],
  );

  const handleAddWorkspace = useCallback(async () => {
    if (!addPath.trim()) return;
    try {
      await apiPost('/workspaces/add', { path: addPath.trim() });
      setAddPath('');
      void mutateWorkspaces();
    } catch (err) {
      console.error('Failed to add workspace:', err);
    }
  }, [addPath, mutateWorkspaces]);

  const handleRemoveWorkspace = useCallback(
    async (path: string) => {
      if (!window.confirm(`Remove workspace "${path}"?`)) return;
      try {
        await apiPost('/workspaces/remove', { path });
        void mutateWorkspaces();
      } catch (err) {
        console.error('Failed to remove workspace:', err);
      }
    },
    [mutateWorkspaces],
  );

  const segments = currentPath.split('/').filter(Boolean);
  const breadcrumbParts = segments.map((seg, i) => ({
    label: seg,
    path: '/' + segments.slice(0, i + 1).join('/'),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <FolderOpen className="w-4 h-4 text-[var(--muted)]" />
        <span className="text-sm font-medium text-[var(--text)] truncate">Workspace</span>
        <GitBadge status={gitData?.git ?? null} />
        <span className="flex-1" />
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {(
            [
              ['files', 'Files'],
              ['artifacts', FileText],
              ['git', GitBranch],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-2 py-0.5 text-[10px] transition-colors flex items-center',
                activeTab === tab
                  ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]',
              )}
            >
              {typeof label === 'string' ? label : <span className="w-3 h-3" aria-hidden="true" />}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-[var(--muted)]', manageMode && 'text-[var(--accent)]')}
          onClick={() => setManageMode(!manageMode)}
          aria-label="Manage workspaces"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)]"
          onClick={() => handleBreadcrumb(currentPath)}
          aria-label="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {manageMode ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <h3 className="text-xs font-medium text-[var(--muted)]">Workspaces</h3>
          {workspaces.map((ws) => (
            <div
              key={ws.path}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text)] truncate">{ws.name}</div>
                <div className="text-xs text-[var(--muted)] truncate">{ws.path}</div>
                {ws.is_git && (
                  <div className="text-xs text-[var(--muted)]">
                    <span className="text-green-400">git</span> {ws.branch}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[var(--error)] shrink-0"
                onClick={() => void handleRemoveWorkspace(ws.path)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="Workspace path"
              value={addPath}
              onChange={(e) => setAddPath(e.target.value)}
              placeholder="/path/to/workspace"
              className="flex-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddWorkspace();
              }}
            />
            <Button size="sm" onClick={() => void handleAddWorkspace()} disabled={!addPath.trim()}>
              Add
            </Button>
          </div>
        </div>
      ) : activeTab === 'git' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <GitOperations sessionId={sessionId} />
        </div>
      ) : activeTab === 'artifacts' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ArtifactList
            onOpenFile={(path) => {
              setSelectedFile(path);
              void handleFileSelect(path);
              setActiveTab('files');
            }}
          />
        </div>
      ) : (
        <>
          {/* Breadcrumbs */}
          {currentPath && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)] text-xs text-[var(--muted)] overflow-x-auto whitespace-nowrap">
              <button
                onClick={() => handleBreadcrumb(workspace)}
                className="hover:text-[var(--text)] hover:bg-[var(--hover-bg)] px-[3px] rounded shrink-0"
              >
                <Home className="w-3 h-3" />
              </button>
              {breadcrumbParts.map((part, i) => (
                <span key={part.path} className="flex items-center gap-1 shrink-0">
                  <span className="text-[var(--border)]">/</span>
                  {i === breadcrumbParts.length - 1 ? (
                    <span className="text-[var(--text)] font-medium px-[3px]">{part.label}</span>
                  ) : (
                    <button
                      onClick={() => handleBreadcrumb(part.path)}
                      className="hover:text-[var(--text)] hover:bg-[var(--hover-bg)] px-[3px] rounded"
                    >
                      {part.label}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {selectedFile ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <FilePreview path={selectedFile} content={fileContent ?? ''} onClose={() => setSelectedFile(null)} />
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0 overflow-hidden">
              {loading ? (
                <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>
              ) : (
                <FileTree
                  entries={rootEntries}
                  onFileSelect={handleFileSelect}
                  onDirToggle={handleDirToggle}
                  onDelete={handleDelete}
                  expanded={expanded}
                  dirCache={dirCache}
                />
              )}
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
