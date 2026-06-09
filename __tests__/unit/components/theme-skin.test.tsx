import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSwitcher } from '@/components/panels/theme-switcher';
import { SkinPicker } from '@/components/panels/skin-picker';

describe('ThemeSwitcher', () => {
  it('renders three theme buttons', () => {
    render(<ThemeSwitcher current="system" onChange={vi.fn()} />);
    expect(screen.getByText(/system/i)).toBeTruthy();
    expect(screen.getByText(/light/i)).toBeTruthy();
    expect(screen.getByText(/dark/i)).toBeTruthy();
  });

  it('highlights the active theme', () => {
    render(<ThemeSwitcher current="dark" onChange={vi.fn()} />);
    const darkBtn = screen.getByText(/dark/i);
    expect(darkBtn.className).toMatch(/bg-\[var/);
  });

  it('calls onChange when a theme is clicked', () => {
    const onChange = vi.fn();
    render(<ThemeSwitcher current="system" onChange={onChange} />);
    fireEvent.click(screen.getByText(/light/i));
    expect(onChange).toHaveBeenCalledWith('light');
  });
});

describe('SkinPicker', () => {
  it('renders 16 skin swatches', () => {
    render(<SkinPicker current="default" onChange={vi.fn()} />);
    const swatches = screen.getAllByRole('button');
    expect(swatches).toHaveLength(16);
  });

  it('calls onChange when a skin is clicked', () => {
    const onChange = vi.fn();
    render(<SkinPicker current="default" onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(onChange).toHaveBeenCalled();
  });
});
