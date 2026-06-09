import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileEditor } from '@/components/workspace/file-editor';

describe('FileEditor', () => {
  it('renders textarea with file content', () => {
    render(<FileEditor path="src/app.ts" content="export {}" onSave={vi.fn()} />);
    const textarea = screen.getByDisplayValue('export {}');
    expect(textarea).toBeTruthy();
  });

  it('shows save button', () => {
    render(<FileEditor path="src/app.ts" content="hello" onSave={vi.fn()} />);
    expect(screen.getByText(/save/i)).toBeTruthy();
  });

  it('calls onSave with new content on save click', () => {
    const onSave = vi.fn();
    render(<FileEditor path="src/app.ts" content="original" onSave={onSave} />);
    const textarea = screen.getByDisplayValue('original');
    fireEvent.change(textarea, { target: { value: 'updated' } });
    fireEvent.click(screen.getByText(/save/i));
    expect(onSave).toHaveBeenCalledWith('src/app.ts', 'updated');
  });
});
