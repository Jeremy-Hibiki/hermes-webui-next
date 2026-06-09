import { atom } from 'jotai';
import type { ThemeMode, FontSize } from '@/types';

export const activeProfileAtom = atom<string>('default');
export const themeAtom = atom<ThemeMode>('system');
export const skinAtom = atom<string>('default');
export const fontSizeAtom = atom<FontSize>('default');
export const defaultModelAtom = atom<string | null>(null);
export const sendKeyAtom = atom<'enter' | 'cmd-enter'>('enter');

export const isActiveProfileDefaultAtom = atom((get) => get(activeProfileAtom) === 'default');

export const assistantDisplayNameAtom = atom((get) => {
  const profile = get(activeProfileAtom);
  if (profile && profile !== 'default') {
    return profile.charAt(0).toUpperCase() + profile.slice(1);
  }
  return 'Hermes';
});
