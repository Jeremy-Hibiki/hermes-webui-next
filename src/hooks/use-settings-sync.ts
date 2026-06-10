'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import type { ThemeMode, FontSize } from '@/types';
import {
  themeAtom,
  skinAtom,
  fontSizeAtom,
  defaultModelAtom,
  sendKeyAtom,
  languageAtom,
  soundEnabledAtom,
  ttsEnabledAtom,
  ttsEngineAtom,
  ttsVoiceAtom,
  ttsRateAtom,
  ttsPitchAtom,
  botNameAtom,
} from '@/atoms/settings';
import { useSetAtom } from 'jotai';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 800;

export function useSettingsSync() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const setTheme = useSetAtom(themeAtom);
  const setSkin = useSetAtom(skinAtom);
  const setFontSize = useSetAtom(fontSizeAtom);
  const setDefaultModel = useSetAtom(defaultModelAtom);
  const setSendKey = useSetAtom(sendKeyAtom);
  const setLanguage = useSetAtom(languageAtom);
  const setSoundEnabled = useSetAtom(soundEnabledAtom);
  const setTtsEnabled = useSetAtom(ttsEnabledAtom);
  const setTtsEngine = useSetAtom(ttsEngineAtom);
  const setTtsVoice = useSetAtom(ttsVoiceAtom);
  const setTtsRate = useSetAtom(ttsRateAtom);
  const setTtsPitch = useSetAtom(ttsPitchAtom);
  const setBotName = useSetAtom(botNameAtom);

  const { data: serverSettings, mutate } = useSWR<Record<string, unknown>>('/settings', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Populate atoms from server on first load
  useEffect(() => {
    if (!serverSettings || mountedRef.current) return;
    mountedRef.current = true;
    const s = serverSettings;
    if (s.theme) setTheme(s.theme as ThemeMode);
    if (s.skin) setSkin(s.skin as string);
    if (s.font_size) setFontSize(s.font_size as FontSize);
    if (s.default_model) setDefaultModel(s.default_model as string);
    if (s.send_key) setSendKey(s.send_key as 'enter' | 'ctrl+enter');
    if (s.language) setLanguage(s.language as string);
    if (s.sound_enabled != null) setSoundEnabled(!!s.sound_enabled);
    if (s.tts_enabled != null) setTtsEnabled(!!s.tts_enabled);
    if (s.tts_engine) setTtsEngine(s.tts_engine as 'browser' | 'edge');
    if (s.tts_voice) setTtsVoice(s.tts_voice as string);
    if (s.tts_rate != null) setTtsRate(Number(s.tts_rate));
    if (s.tts_pitch != null) setTtsPitch(Number(s.tts_pitch));
    if (s.bot_name) setBotName(s.bot_name as string);
  }, [
    serverSettings,
    setTheme,
    setSkin,
    setFontSize,
    setDefaultModel,
    setSendKey,
    setLanguage,
    setSoundEnabled,
    setTtsEnabled,
    setTtsEngine,
    setTtsVoice,
    setTtsRate,
    setTtsPitch,
    setBotName,
  ]);

  const save = useCallback(async (patch: Record<string, unknown>) => {
    setStatus('saving');
    try {
      await apiPost('/settings', patch);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }, []);

  const autosave = useCallback(
    (patch: Record<string, unknown>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void save(patch), DEBOUNCE_MS);
    },
    [save],
  );

  const reload = useCallback(() => void mutate(), [mutate]);

  return { status, autosave, save, reload, serverSettings };
}
