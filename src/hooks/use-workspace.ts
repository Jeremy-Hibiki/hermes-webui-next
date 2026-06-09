'use client';

import { useState, useCallback } from 'react';
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
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async (dir: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/list?path=${encodeURIComponent(dir)}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setFileTree(Array.isArray(data) ? data : (data.entries ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tree');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFile = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setFileContent(data.content ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveFile = useCallback(async (path: string, content: string) => {
    setError(null);
    const res = await fetch(`${API_BASE}/file/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path, content }),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
  }, []);

  const createFile = useCallback(async (path: string, type: 'file' | 'dir') => {
    setError(null);
    const res = await fetch(`${API_BASE}/file/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path, type }),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
  }, []);

  const deleteFile = useCallback(async (path: string) => {
    setError(null);
    const res = await fetch(`${API_BASE}/file/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
  }, []);

  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    setError(null);
    const res = await fetch(`${API_BASE}/file/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ old_path: oldPath, new_path: newPath }),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
  }, []);

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
