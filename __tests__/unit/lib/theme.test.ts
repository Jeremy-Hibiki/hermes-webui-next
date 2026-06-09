import { describe, it, expect } from 'vite-plus/test';
import { SKINS, THEMES, getSkinConfig, resolveTheme } from '@/lib/theme';

describe('Theme config', () => {
  it('defines 16 skins', () => {
    expect(SKINS.length).toBe(16);
    const ids = SKINS.map((s) => s.id);
    expect(ids).toContain('default');
    expect(ids).toContain('ares');
    expect(ids).toContain('graphite');
    expect(ids).toContain('catppuccin');
    expect(ids).toContain('zeus');
  });

  it('defines 3 theme modes', () => {
    expect(THEMES).toEqual(['system', 'dark', 'light']);
  });

  it('getSkinConfig returns skin by id', () => {
    expect(getSkinConfig('ares')?.name).toBe('Ares');
  });

  it('getSkinConfig returns undefined for unknown', () => {
    expect(getSkinConfig('nonexistent')).toBeUndefined();
  });

  it('resolveTheme passes through dark/light', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });

  it('resolveTheme resolves system to dark or light', () => {
    const resolved = resolveTheme('system');
    expect(['dark', 'light']).toContain(resolved);
  });
});
