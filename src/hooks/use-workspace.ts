'use client';

import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { activeSessionAtom } from '@/atoms/session';
import type { FileEntry } from '@/types';
import { API_BASE } from '@/lib/constants';

interface UseWorkspaceReturn {
  fileTree: FileEntry[];
  fileContent: string | null;
  loading: boolean;
  error: string | null;
  fetchTree: (dir: string) => Promise<void>;
  fetchFile: (path: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string, type: 'file' | 'dir') => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
}

export function useWorkspace(): UseWorkspaceReturn {
  const [activeSession] = useAtom(activeSessionAtom);
  const sessionId = activeSession?.session_id ?? '';

  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(
    async (dir: string) => {
      if (!sessionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/list?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(dir)}`,
          {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          },
        );
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        setFileTree(Array.isArray(data) ? data : (data.entries ?? []));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tree');
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  const fetchFile = useCallback(
    async (path: string) => {
      if (!sessionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/file?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`,
          {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          },
        );
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        setFileContent(data.content ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch file');
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  const saveFile = useCallback(
    async (path: string, content: string) => {
      if (!sessionId) return;
      setError(null);
      const res = await fetch(`${API_BASE}/file/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId, path, content }),
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
    },
    [sessionId],
  );

  const createFile = useCallback(
    async (path: string, type: 'file' | 'dir') => {
      if (!sessionId) return;
      setError(null);
      const res = await fetch(`${API_BASE}/file/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId, path, type }),
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
    },
    [sessionId],
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!sessionId) return;
      setError(null);
      const res = await fetch(`${API_BASE}/file/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId, path }),
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
    },
    [sessionId],
  );

  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!sessionId) return;
      setError(null);
      const res = await fetch(`${API_BASE}/file/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId, old_path: oldPath, new_path: newPath }),
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
    },
    [sessionId],
  );

  return {
    fileTree,
    fileContent,
    loading,
    error,
    fetchTree,
    fetchFile,
    saveFile,
    createFile,
    deleteFile,
    renameFile,
  };
}
