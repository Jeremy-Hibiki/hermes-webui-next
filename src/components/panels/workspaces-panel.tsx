'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { useAtom } from 'jotai';
import { activeWorkspaceAtom } from '@/atoms/settings';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from '@/lib/i18n';
import { ArrowLeft, Check, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceEntry {
  name: string;
  path: string;
  active?: boolean;
}

interface WorkspacesResponse {
  workspaces: WorkspaceEntry[];
  active: string;
  last?: string;
}

interface SuggestionData {
  suggestions: string[];
  prefix: string;
}

export function WorkspacesPanel() {
  const {
    data,
    mutate,
    isLoading: workspacesLoading,
  } = useSWR<WorkspacesResponse>('/workspaces', fetcher, {
    revalidateOnFocus: false,
  });
  const [, setActiveWorkspace] = useAtom(activeWorkspaceAtom);
  const { toast } = useToast();
  const { t: t18n } = useTranslation();

  const [createMode, setCreateMode] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail view state
  const [selectedWs, setSelectedWs] = useState<WorkspaceEntry | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const workspaces = data?.workspaces ?? [];
  const active = data?.last ?? data?.active ?? '';

  const handleSwitch = useCallback(
    async (path: string) => {
      // Backend has no /workspaces/switch endpoint; workspace is session-scoped.
      setActiveWorkspace(path);
      toast('Workspace selection is session-scoped only.', 'info');
    },
    [setActiveWorkspace, toast],
  );

  const handleSetDefault = useCallback(
    async (_name: string) => {
      // Backend has no /workspaces/default endpoint.
      toast('Setting a default workspace is not supported by the backend.', 'info');
    },
    [toast],
  );

  const handleCreate = useCallback(async () => {
    const name = formName.trim();
    const path = formPath.trim();
    if (!name || !path) return;
    try {
      await apiPost('/workspaces/add', { name, path });
      setCreateMode(false);
      setFormName('');
      setFormPath('');
      setSuggestions([]);
      setShowSuggestions(false);
      void mutate();
      toast(`Workspace "${name}" created`, 'success');
    } catch (err) {
      toast(`Create failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, [formName, formPath, mutate, toast]);

  const handleDelete = useCallback(
    async (path: string) => {
      try {
        await apiPost('/workspaces/remove', { path });
        setSelectedWs(null);
        setConfirmDelete(false);
        void mutate();
        toast('Workspace deleted', 'success');
      } catch (err) {
        toast(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      }
    },
    [mutate, toast],
  );

  const handleRename = useCallback(
    async (path: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      try {
        await apiPost('/workspaces/rename', { path, name: trimmed });
        setRenaming(false);
        setSelectedWs((prev) => (prev ? { ...prev, name: trimmed } : null));
        void mutate();
        toast('Workspace renamed', 'success');
      } catch (err) {
        toast(`Rename failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      }
    },
    [mutate, toast],
  );

  // Path suggestions with debounce
  const fetchSuggestions = useCallback(async (prefix: string) => {
    if (!prefix.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const data = await fetcher<SuggestionData>(`/workspaces/suggest?prefix=${encodeURIComponent(prefix)}`);
      setSuggestions(data.suggestions ?? []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handlePathChange = useCallback(
    (value: string) => {
      setFormPath(value);
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
      suggestTimer.current = setTimeout(() => fetchSuggestions(value), 300);
    },
    [fetchSuggestions],
  );

  const applySuggestion = useCallback((path: string) => {
    const next = path.endsWith('/') ? path : `${path}/`;
    setFormPath(next);
    setShowSuggestions(false);
  }, []);

  useEffect(() => {
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, []);

  const openDetail = useCallback((ws: WorkspaceEntry) => {
    setSelectedWs(ws);
    setRenaming(false);
    setConfirmDelete(false);
  }, []);

  const backToList = useCallback(() => {
    setSelectedWs(null);
    setRenaming(false);
    setConfirmDelete(false);
  }, []);

  // ── Detail view ──
  if (selectedWs) {
    const isActive = selectedWs.path === active;
    const isDefault = selectedWs.name === 'Home';

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--muted)] hover:text-[var(--text)] h-6 w-6"
            onClick={backToList}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-sm font-semibold text-[var(--text)] truncate">{selectedWs.name}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name & path */}
          <div className="space-y-1">
            {renaming ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleRename(selectedWs.path, renameValue);
                    if (e.key === 'Escape') setRenaming(false);
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => void handleRename(selectedWs.path, renameValue)}
                  disabled={!renameValue.trim()}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text)]">{selectedWs.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-[var(--muted)] hover:text-[var(--text)]"
                  onClick={() => {
                    setRenameValue(selectedWs.name);
                    setRenaming(true);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            )}
            <div className="text-xs text-[var(--muted)] font-mono break-all">{selectedWs.path}</div>
          </div>

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            {isActive && (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 rounded px-2 py-0.5">
                <Check className="w-3 h-3" /> Active
              </span>
            )}
            {isDefault && (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-400/10 rounded px-2 py-0.5">
                Default
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            {!isActive && (
              <Button size="sm" className="w-full" onClick={() => void handleSwitch(selectedWs.path)}>
                Set as Active
              </Button>
            )}
            {!isDefault && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => void handleSetDefault(selectedWs.name)}
              >
                Set as Default
              </Button>
            )}
          </div>

          {/* Danger zone */}
          <div className="pt-4 border-t border-[var(--border)]">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--error)]">Remove this workspace from the list?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => void handleDelete(selectedWs.path)}>
                    Confirm Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-[var(--muted)] hover:text-[var(--error)]"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          {t18n('workspaces.title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => {
            setCreateMode(!createMode);
            setSuggestions([]);
            setShowSuggestions(false);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
        Add and switch workspaces for your sessions.
      </div>

      {createMode && (
        <div className="px-4 py-3 border-b border-[var(--border)] space-y-2">
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Workspace name"
            className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
          />
          <div className="relative">
            <input
              type="text"
              value={formPath}
              onChange={(e) => handlePathChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="/path/to/project"
              className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 border border-[var(--border)] rounded bg-[var(--surface)] shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--hover-bg)] truncate"
                    onMouseDown={() => applySuggestion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleCreate()} disabled={!formName.trim() || !formPath.trim()}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreateMode(false);
                setShowSuggestions(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {workspacesLoading && workspaces.length === 0 ? (
          <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="p-4 text-sm text-[var(--muted)] text-center">No workspaces configured</div>
        ) : (
          workspaces.map((ws) => (
            <div
              key={ws.path}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] transition-colors cursor-pointer',
                ws.path === active
                  ? 'bg-[var(--accent-bg)] border-[var(--accent)]'
                  : 'bg-[var(--surface)] hover:bg-[var(--hover-bg)]',
              )}
              onClick={() => openDetail(ws)}
            >
              <FolderOpen className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text)] truncate">{ws.name}</div>
                <div className="text-xs text-[var(--muted)] truncate">{ws.path}</div>
              </div>
              {ws.path === active && (
                <span className="text-green-400 flex items-center gap-0.5 text-[10px]">
                  <Check className="w-3 h-3" /> Active
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
