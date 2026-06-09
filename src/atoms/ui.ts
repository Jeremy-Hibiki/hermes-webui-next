import { atom } from 'jotai';

export const sidebarCollapsedAtom = atom<boolean>(false);
export const workspacePanelOpenAtom = atom<boolean>(true);
export const currentPanelAtom = atom<string>('chat');
export const currentDirAtom = atom<string>('.');
export const showHiddenFilesAtom = atom<boolean>(false);
export const commandDropdownOpenAtom = atom<boolean>(false);
export const currentMobileViewAtom = atom<'sidebar' | 'chat' | 'workspace'>('chat');
