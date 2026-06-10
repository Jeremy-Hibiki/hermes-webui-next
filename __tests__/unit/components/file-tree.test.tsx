import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTree } from '@/components/workspace/file-tree';
import type { FileEntry } from '@/types';

const mockEntries: FileEntry[] = [
  { name: 'src', path: 'src', type: 'dir' },
  { name: 'index.ts', path: 'src/index.ts', type: 'file', size: 120 },
  { name: 'README.md', path: 'README.md', type: 'file', size: 50 },
];

describe('FileTree', () => {
  it('renders file entries', () => {
    render(
      <FileTree
        entries={mockEntries}
        onFileSelect={vi.fn()}
        onDirToggle={vi.fn()}
        expanded={new Set()}
        dirCache={{}}
      />,
    );
    expect(screen.getByText('src')).toBeTruthy();
    expect(screen.getByText('index.ts')).toBeTruthy();
    expect(screen.getByText('README.md')).toBeTruthy();
  });

  it('calls onFileSelect when a file is clicked', () => {
    const onFileSelect = vi.fn();
    render(
      <FileTree
        entries={mockEntries}
        onFileSelect={onFileSelect}
        onDirToggle={vi.fn()}
        expanded={new Set()}
        dirCache={{}}
      />,
    );
    fireEvent.click(screen.getByText('index.ts'));
    expect(onFileSelect).toHaveBeenCalledWith('src/index.ts');
  });

  it('calls onDirToggle when a directory is clicked', () => {
    const onDirToggle = vi.fn();
    render(
      <FileTree
        entries={mockEntries}
        onFileSelect={vi.fn()}
        onDirToggle={onDirToggle}
        expanded={new Set()}
        dirCache={{}}
      />,
    );
    fireEvent.click(screen.getByText('src'));
    expect(onDirToggle).toHaveBeenCalledWith('src');
  });

  it('shows empty state when no entries', () => {
    render(<FileTree entries={[]} onFileSelect={vi.fn()} onDirToggle={vi.fn()} expanded={new Set()} dirCache={{}} />);
    expect(screen.getByText(/empty/i)).toBeTruthy();
  });

  it('shows file size for files', () => {
    render(
      <FileTree
        entries={mockEntries}
        onFileSelect={vi.fn()}
        onDirToggle={vi.fn()}
        expanded={new Set()}
        dirCache={{}}
      />,
    );
    expect(screen.getByText('0.1k')).toBeTruthy();
  });
});
