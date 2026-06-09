import { describe, it, expect } from 'vite-plus/test';
import { render } from '@testing-library/react';
import { StreamingCursor } from '@/components/chat/streaming-cursor';

describe('StreamingCursor', () => {
  it('renders when streaming is true', () => {
    const { container } = render(<StreamingCursor streaming={true} />);
    expect(container.querySelector("[data-testid='streaming-cursor']")).toBeTruthy();
  });

  it('does not render when streaming is false', () => {
    const { container } = render(<StreamingCursor streaming={false} />);
    expect(container.querySelector("[data-testid='streaming-cursor']")).toBeFalsy();
  });

  it('has animated class for pulsing effect', () => {
    const { container } = render(<StreamingCursor streaming={true} />);
    const el = container.querySelector("[data-testid='streaming-cursor']");
    expect(el).toBeTruthy();
    expect(el?.className).toMatch(/animate/);
  });
});
