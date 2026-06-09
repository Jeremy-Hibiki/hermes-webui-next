import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkspace } from '@/hooks/use-workspace';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('useWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches file tree for a directory', async () => {
    const files = [
      { name: 'src', type: 'dir', path: 'src' },
      { name: 'index.ts', type: 'file', path: 'src/index.ts', size: 120 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(files),
    });

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.fetchTree('src');
    });

    await waitFor(() => {
      expect(result.current.fileTree).toHaveLength(2);
      expect(result.current.fileTree[0].name).toBe('src');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/list?path=src',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('fetches file content', async () => {
    const content = { path: 'src/index.ts', content: "console.log('hi')" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(content),
    });

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.fetchFile('src/index.ts');
    });

    await waitFor(() => {
      expect(result.current.fileContent).toBe("console.log('hi')");
    });
  });

  it('saves a file via POST', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.saveFile('src/index.ts', 'new content');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/file/save',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: 'src/index.ts', content: 'new content' }),
      }),
    );
  });

  it('creates a new file', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.createFile('src/new.ts', 'file');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/file/create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: 'src/new.ts', type: 'file' }),
      }),
    );
  });

  it('deletes a file', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.deleteFile('src/old.ts');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/file/delete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: 'src/old.ts' }),
      }),
    );
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      try {
        await result.current.fetchTree('/bad');
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
