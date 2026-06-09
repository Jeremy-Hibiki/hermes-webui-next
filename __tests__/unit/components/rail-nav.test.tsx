import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { RailNav } from '@/components/layout/rail-nav';

describe('RailNav', () => {
  it('renders navigation buttons', () => {
    render(<RailNav activePanel="chat" onPanelChange={() => {}} />);
    expect(screen.getByLabelText('Chat')).toBeDefined();
    expect(screen.getByLabelText('Settings')).toBeDefined();
  });

  it('highlights active panel', () => {
    render(<RailNav activePanel="chat" onPanelChange={() => {}} />);
    const chatBtn = screen.getByLabelText('Chat');
    expect(chatBtn.className).toContain('active');
  });

  it('calls onPanelChange when button clicked', async () => {
    const onChange = vi.fn();
    render(<RailNav activePanel="chat" onPanelChange={onChange} />);
    const settingsBtn = screen.getByLabelText('Settings');
    settingsBtn.click();
    expect(onChange).toHaveBeenCalledWith('settings');
  });
});
