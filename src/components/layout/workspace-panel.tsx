'use client';

import { useAtom } from 'jotai';
import { activeSessionAtom } from '@/atoms/session';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  FolderOpen,
  RefreshCw,
  Plus,
  Trash2,
  Home,
  GitBranch,
  Upload,
  Download,
  Eye,
  EyeOff,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import { FileTree } from '@/components/workspace/file-tree';
import { FilePreview } from '@/components/workspace/file-preview';
import { GitBadge } from '@/components/workspace/git-badge';
import { GitOperations } from '@/components/workspace/git-operations';
import { ArtifactList } from '@/components/workspace/artifact-list';
import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [showHidden, setShowHidden] = useState(() => {
    try {
      return localStorage.getItem('hermes-workspace-show-hidden-files') === 'true';
    } catch {
      return false;
    }
  });
  const [creating, setCreating] = useState<'file' | 'dir' | null>(null);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const refreshCurrentDir = useCallback(async () => {
    if (!workspace) return;
    const dir = currentPath || workspace;
    const entries = await fetchDir(dir);
    if (dir === workspace) {
      setRootEntries(entries);
    }
    setDirCache((prev) => ({ ...prev, [dir]: entries }));
  }, [workspace, currentPath, fetchDir]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || !creating) return;
    try {
      await apiPost('/file/create', {
        session_id: sessionId,
        path: `${currentPath || workspace}/${newName.trim()}`,
        type: creating,
      });
      setNewName('');
      setCreating(null);
      await refreshCurrentDir();
    } catch (err) {
      console.error('Create failed:', err);
    }
  }, [newName, creating, sessionId, currentPath, workspace, refreshCurrentDir]);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !sessionId) return;
      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('session_id', sessionId);
          formData.append('target_dir', currentPath || workspace);
          await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
        } catch (err) {
          console.error('Upload failed:', file.name, err);
        }
      }
      await refreshCurrentDir();
    },
    [sessionId, currentPath, workspace, refreshCurrentDir],
  );

  const handleDownload = useCallback(
    async (path: string, name: string) => {
      try {
        const res = await fetch(
          `${API_BASE}/file/raw?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`,
          { credentials: 'include' },
        );
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download failed:', err);
      }
    },
    [sessionId],
  );

  const toggleHidden = useCallback(() => {
    setShowHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hermes-workspace-show-hidden-files', String(next));
      } catch {}
      return next;
    });
  }, []);

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
        <span
          className="text-sm font-medium text-[var(--text)] truncate cursor-pointer hover:text-[var(--accent)]"
          onClick={() => handleBreadcrumb(workspace)}
        >
          Workspace
        </span>
        <GitBadge status={gitData?.git ?? null} />
        <span className="flex-1" />
        {activeTab === 'files' && !selectedFile && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="absolute left-[-9999px] w-px h-px opacity-0"
              onChange={(e) => {
                void handleUpload(e.target.files);
                e.target.value = '';
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--muted)]"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload"
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--muted)]"
              onClick={() => setCreating('file')}
              aria-label="New file"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--muted)]"
              onClick={() => setCreating('dir')}
              aria-label="New folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('text-[var(--muted)]', showHidden && 'text-[var(--accent)]')}
              onClick={toggleHidden}
              aria-label="Toggle hidden files"
            >
              {showHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
          </>
        )}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {(
            [
              ['files', 'Files'],
              ['artifacts', 'Artifacts'],
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
              {typeof label === 'string' ? label : <label className="w-3 h-3" aria-hidden="true" />}
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
          onClick={() => void refreshCurrentDir()}
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
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
                <span className="text-xs text-[var(--muted)] truncate flex-1">{selectedFile.split('/').pop()}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[var(--muted)] h-6 w-6"
                  onClick={() => void handleDownload(selectedFile, selectedFile.split('/').pop() || 'file')}
                  aria-label="Download"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
              <FilePreview
                path={selectedFile}
                content={fileContent ?? ''}
                sessionId={sessionId}
                onClose={() => setSelectedFile(null)}
              />
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0 overflow-hidden">
              {/* New file/folder input */}
              {creating && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
                  <span className="text-[11px] text-[var(--muted)]">
                    {creating === 'file' ? 'New file:' : 'New folder:'}
                  </span>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreate();
                      if (e.key === 'Escape') {
                        setCreating(null);
                        setNewName('');
                      }
                    }}
                    onBlur={() => {
                      if (!newName.trim()) {
                        setCreating(null);
                        setNewName('');
                      }
                    }}
                    placeholder={creating === 'file' ? 'filename.txt' : 'folder-name'}
                    className="flex-1 bg-transparent text-[12px] text-[var(--text)] outline-none border-b border-[var(--accent)]"
                  />
                </div>
              )}
              {loading ? (
                <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>
              ) : (
                <FileTree
                  entries={rootEntries}
                  onFileSelect={handleFileSelect}
                  onDirToggle={handleDirToggle}
                  onDelete={handleDelete}
                  onRename={async (path, newName) => {
                    try {
                      await apiPost('/file/rename', { session_id: sessionId, path, new_name: newName });
                      await refreshCurrentDir();
                    } catch (err) {
                      console.error('Rename failed:', err);
                    }
                  }}
                  onDownload={handleDownload}
                  expanded={expanded}
                  dirCache={dirCache}
                  showHidden={showHidden}
                />
              )}
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
