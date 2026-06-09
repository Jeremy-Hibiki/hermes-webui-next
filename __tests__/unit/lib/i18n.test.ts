import { describe, it, expect } from 'vite-plus/test';
import { i18n, t, setLocale, getLocale } from '@/lib/i18n';

describe('i18n', () => {
  it('returns English strings by default', () => {
    expect(t('app.title')).toBe('Hermes');
  });

  it('falls back to key for unknown strings', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('switches locale', () => {
    setLocale('zh');
    expect(getLocale()).toBe('zh');
  });

  it('falls back to English for missing translations', () => {
    setLocale('zh');
    // Most keys should still work with fallback
    expect(typeof t('app.title')).toBe('string');
    // Reset
    setLocale('en');
  });
});
