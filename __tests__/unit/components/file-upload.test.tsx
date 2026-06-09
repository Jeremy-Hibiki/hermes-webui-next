import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '@/components/workspace/file-upload';

describe('FileUpload', () => {
  it('renders drop zone text', () => {
    render(<FileUpload onUpload={vi.fn()} />);
    expect(screen.getByText(/drop files/i)).toBeTruthy();
  });

  it('has a file input', () => {
    render(<FileUpload onUpload={vi.fn()} />);
    const input = screen.getByLabelText(/choose files/i) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('file');
  });

  it('calls onUpload when files are selected', () => {
    const onUpload = vi.fn();
    render(<FileUpload onUpload={onUpload} />);
    const input = screen.getByLabelText(/choose files/i);
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalled();
  });
});
