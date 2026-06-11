import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { FilePreview } from '@/components/workspace/file-preview';

describe('FilePreview', () => {
  it('renders code content with file path', () => {
    render(<FilePreview path="src/index.ts" content="console.log('hi')" sessionId="s1" />);
    expect(screen.getByText('src/index.ts')).toBeTruthy();
    expect(screen.getByText(/console\.log/)).toBeTruthy();
  });

  it('renders image when path is image', () => {
    render(<FilePreview path="img/photo.png" content="" sessionId="s1" />);
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
  });

  it('renders nothing when no content and not image', () => {
    const { container } = render(<FilePreview path="src/empty.ts" content="" sessionId="s1" />);
    expect(container.innerHTML).toBe('');
  });

  it('shows close button when onClose provided', () => {
    render(<FilePreview path="src/app.ts" content="export {}" sessionId="s1" onClose={vi.fn()} />);
    expect(screen.getByLabelText(/close/i)).toBeTruthy();
  });
});
