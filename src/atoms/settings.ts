import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { ThemeMode, FontSize } from '@/types';

export const activeProfileAtom = atom<string>('default');
export const activeWorkspaceAtom = atom<string>('');
export const themeAtom = atomWithStorage<ThemeMode>('hermes-theme', 'system');
export const skinAtom = atomWithStorage<string>('hermes-skin', 'default');
export const fontSizeAtom = atomWithStorage<FontSize>('hermes-font-size', 'default');
export const defaultModelAtom = atom<string | null>(null);
export const sendKeyAtom = atomWithStorage<'enter' | 'ctrl+enter'>('hermes-send-key', 'enter');

// Appearance
export const workspacePanelDefaultAtom = atomWithStorage<boolean>('hermes-webui-workspace-panel-default', false);
export const sessionJumpButtonsAtom = atomWithStorage<boolean>('hermes-session-jump-buttons', true);
export const endlessScrollAtom = atomWithStorage<boolean>('hermes-endless-scroll', true);
export const activityFeedExpandedAtom = atomWithStorage<boolean>('hermes-activity-feed-expanded', false);

// Preferences
export const hideSuggestionsAtom = atomWithStorage<boolean>('hermes-hide-suggestions', false);
export const languageAtom = atomWithStorage<string>('hermes-language', 'en');
export const rtlAtom = atomWithStorage<boolean>('hermes-rtl', false);
export const soundEnabledAtom = atomWithStorage<boolean>('hermes-sound-enabled', false);
export const ttsEnabledAtom = atomWithStorage<boolean>('hermes-tts-enabled', false);
export const ttsAutoReadAtom = atomWithStorage<boolean>('hermes-tts-auto-read', false);
export const voiceModeEnabledAtom = atomWithStorage<boolean>('hermes-voice-mode-enabled', false);
export const rawAudioAtom = atomWithStorage<boolean>('hermes-raw-audio', false);
export const ttsEngineAtom = atomWithStorage<'browser' | 'edge'>('hermes-tts-engine', 'browser');
export const ttsVoiceAtom = atomWithStorage<string>('hermes-tts-voice', '');
export const ttsRateAtom = atomWithStorage<number>('hermes-tts-rate', 1.0);
export const ttsPitchAtom = atomWithStorage<number>('hermes-tts-pitch', 1.0);
export const notificationsEnabledAtom = atomWithStorage<boolean>('hermes-notifications-enabled', false);
export const tokenUsageAtom = atomWithStorage<boolean>('hermes-token-usage', false);
export const quotaChipAtom = atomWithStorage<boolean>('hermes-quota-chip', false);
export const tpsAtom = atomWithStorage<boolean>('hermes-tps', false);
export const fadeTextEffectAtom = atomWithStorage<boolean>('hermes-fade-text-effect', false);
export const compactToolActivityAtom = atomWithStorage<boolean>('hermes-compact-tool-activity', false);
export const terminalAutoExpandAtom = atomWithStorage<boolean>('hermes-terminal-auto-expand', false);
export const apiRedactAtom = atomWithStorage<boolean>('hermes-api-redact', true);
export const sidebarDensityAtom = atomWithStorage<'compact' | 'detailed'>('hermes-sidebar-density', 'compact');
export const pinnedSessionsLimitAtom = atomWithStorage<number>('hermes-pinned-sessions-limit', 3);
export const autoTitleRefreshAtom = atomWithStorage<'0' | '5' | '10' | '20'>('hermes-auto-title-refresh', '0');
export const busyInputModeAtom = atomWithStorage<'queue' | 'interrupt' | 'steer'>('hermes-busy-input-mode', 'queue');
export const showCliSessionsAtom = atomWithStorage<boolean>('hermes-show-cli-sessions', false);
export const showCronSessionsAtom = atomWithStorage<boolean>('hermes-show-cron-sessions', false);
export const showPreviousMessagingAtom = atomWithStorage<boolean>('hermes-show-previous-messaging', false);
export const syncInsightsAtom = atomWithStorage<boolean>('hermes-sync-insights', false);
export const checkUpdatesAtom = atomWithStorage<boolean>('hermes-check-updates', true);
export const ignoreAgentUpdatesAtom = atomWithStorage<boolean>('hermes-ignore-agent-updates', false);
export const whatsNewSummaryAtom = atomWithStorage<boolean>('hermes-whats-new-summary', false);
export const botNameAtom = atomWithStorage<string>('hermes-bot-name', 'Hermes');

// System
export const dashboardModeAtom = atomWithStorage<'auto' | 'always' | 'never'>('hermes-dashboard-mode', 'auto');
export const dashboardUrlAtom = atomWithStorage<string>('hermes-dashboard-url', '');

export const isActiveProfileDefaultAtom = atom((get) => get(activeProfileAtom) === 'default');

export const assistantDisplayNameAtom = atom((get) => {
  const profile = get(activeProfileAtom);
  if (profile && profile !== 'default') {
    return profile.charAt(0).toUpperCase() + profile.slice(1);
  }
  return get(botNameAtom) || 'Hermes';
});
