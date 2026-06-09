import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTree } from '@/components/workspace/file-tree';
import type { FileEntry } from '@/types';

const mockEntries: FileEntry[] = [
  { name: 'src', path: 'src', is_dir: true },
  { name: 'index.ts', path: 'src/index.ts', is_dir: false, size: 120 },
  { name: 'README.md', path: 'README.md', is_dir: false, size: 50 },
];

describe('FileTree', () => {
  it('renders file entries', () => {
    render(<FileTree entries={mockEntries} onFileSelect={vi.fn()} onDirToggle={vi.fn()} />);
    expect(screen.getByText('src')).toBeTruthy();
    expect(screen.getByText('index.ts')).toBeTruthy();
    expect(screen.getByText('README.md')).toBeTruthy();
  });

  it('calls onFileSelect when a file is clicked', () => {
    const onFileSelect = vi.fn();
    render(<FileTree entries={mockEntries} onFileSelect={onFileSelect} onDirToggle={vi.fn()} />);
    fireEvent.click(screen.getByText('index.ts'));
    expect(onFileSelect).toHaveBeenCalledWith('src/index.ts');
  });

  it('calls onDirToggle when a directory is clicked', () => {
    const onDirToggle = vi.fn();
    render(<FileTree entries={mockEntries} onFileSelect={vi.fn()} onDirToggle={onDirToggle} />);
    fireEvent.click(screen.getByText('src'));
    expect(onDirToggle).toHaveBeenCalledWith('src');
  });

  it('shows empty state when no entries', () => {
    render(<FileTree entries={[]} onFileSelect={vi.fn()} onDirToggle={vi.fn()} />);
    expect(screen.getByText(/empty/i)).toBeTruthy();
  });

  it('shows file size for files', () => {
    render(<FileTree entries={mockEntries} onFileSelect={vi.fn()} onDirToggle={vi.fn()} />);
    expect(screen.getByText('120 B')).toBeTruthy();
  });
});
