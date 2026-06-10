import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { t, getLocale } from '@/lib/i18n';

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns English strings by default', () => {
    expect(t('app.title')).toBe('Hermes');
  });

  it('falls back to key for unknown strings', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns Chinese translations when locale is zh', () => {
    localStorage.setItem('hermes-language', 'zh');
    expect(t('chat.send')).toBe('发送');
    expect(t('settings.title')).toBe('设置');
  });

  it('returns English when zh translation is missing', () => {
    localStorage.setItem('hermes-language', 'zh');
    expect(t('app.title')).toBe('Hermes');
  });

  it('getLocale defaults to en', () => {
    expect(getLocale()).toBe('en');
  });

  it('getLocale reads from localStorage', () => {
    localStorage.setItem('hermes-language', 'zh');
    expect(getLocale()).toBe('zh');
  });

  it('falls back to English for missing locale', () => {
    localStorage.setItem('hermes-language', 'xx');
    expect(t('chat.send')).toBe('Send');
  });
});
