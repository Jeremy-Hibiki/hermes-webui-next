'use client';

import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { themeAtom, skinAtom, fontSizeAtom, rtlAtom } from '@/atoms/settings';
import type { FontSize, ThemeMode } from '@/types';
import { applyThemeToDocument, loadThemeFromStorage, saveThemeToStorage } from '@/lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useAtom(themeAtom);
  const [skin, setSkin] = useAtom(skinAtom);
  const [fontSize, setFontSize] = useAtom(fontSizeAtom);
  const [rtl] = useAtom(rtlAtom);

  useEffect(() => {
    const stored = loadThemeFromStorage();
    setTheme(stored.theme as ThemeMode);
    setSkin(stored.skin);
    setFontSize(stored.fontSize as FontSize);
  }, [setTheme, setSkin, setFontSize]);

  useEffect(() => {
    applyThemeToDocument(theme, skin, fontSize);
    saveThemeToStorage(theme, skin, fontSize);
  }, [theme, skin, fontSize]);

  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [rtl]);

  return <>{children}</>;
}
