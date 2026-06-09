import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComposerFooter } from '@/components/layout/composer-footer';

describe('ComposerFooter', () => {
  it('renders textarea and send button', () => {
    render(<ComposerFooter onSend={vi.fn()} busy={false} />);
    expect(screen.getByPlaceholderText(/message/i)).toBeDefined();
    expect(screen.getByLabelText(/send/i)).toBeDefined();
  });

  it('calls onSend with message text', () => {
    const onSend = vi.fn();
    render(<ComposerFooter onSend={onSend} busy={false} />);
    const textarea = screen.getByPlaceholderText(/message/i);
    fireEvent.change(textarea, { target: { value: 'Hello Hermes' } });
    fireEvent.click(screen.getByLabelText(/send/i));
    expect(onSend).toHaveBeenCalledWith('Hello Hermes');
  });

  it('disables send when busy', () => {
    render(<ComposerFooter onSend={vi.fn()} busy={true} />);
    expect(screen.getByLabelText(/cancel/i)).toBeDefined();
  });

  it('renders attach button', () => {
    render(<ComposerFooter onSend={vi.fn()} busy={false} />);
    const buttons = screen.getAllByRole('button');
    const attachBtn = buttons.find((b) => b.getAttribute('aria-label') === 'Attach file');
    expect(attachBtn).toBeTruthy();
  });
});
