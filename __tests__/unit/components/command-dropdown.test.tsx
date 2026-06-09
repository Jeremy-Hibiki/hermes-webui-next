import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandDropdown } from '@/components/chat/command-dropdown';

describe('CommandDropdown', () => {
  it('renders list of completions', () => {
    render(<CommandDropdown completions={['model', 'memory']} onSelect={vi.fn()} visible={true} />);
    expect(screen.getByText('/model')).toBeTruthy();
    expect(screen.getByText('/memory')).toBeTruthy();
  });

  it('calls onSelect when an item is clicked', () => {
    const onSelect = vi.fn();
    render(<CommandDropdown completions={['help', 'model']} onSelect={onSelect} visible={true} />);
    fireEvent.click(screen.getByText('/help'));
    expect(onSelect).toHaveBeenCalledWith('help');
  });

  it('does not render when not visible', () => {
    const { container } = render(<CommandDropdown completions={['model']} onSelect={vi.fn()} visible={false} />);
    expect(container.querySelector("[data-testid='command-dropdown']")).toBeFalsy();
  });

  it('does not render when completions is empty', () => {
    const { container } = render(<CommandDropdown completions={[]} onSelect={vi.fn()} visible={true} />);
    expect(container.querySelector("[data-testid='command-dropdown']")).toBeFalsy();
  });
});
