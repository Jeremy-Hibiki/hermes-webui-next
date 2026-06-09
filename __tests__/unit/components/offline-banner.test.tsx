import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineBanner } from '@/components/shared/offline-banner';

describe('OfflineBanner', () => {
  it('renders offline message when offline', () => {
    render(<OfflineBanner offline={true} onRetry={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/offline/i)).toBeTruthy();
  });

  it('does not render when online', () => {
    const { container } = render(<OfflineBanner offline={false} onRetry={vi.fn()} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<OfflineBanner offline={true} onRetry={onRetry} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByText(/retry/i));
    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onDismiss when dismiss clicked', () => {
    const onDismiss = vi.fn();
    render(<OfflineBanner offline={true} onRetry={vi.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText(/dismiss/i));
    expect(onDismiss).toHaveBeenCalled();
  });
});
