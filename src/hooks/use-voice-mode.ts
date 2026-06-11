'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceModeState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface UseVoiceModeOptions {
  onDictate?: (text: string) => void;
  onSend?: () => void;
  onDictationEnd?: () => void;
}

// Web Speech API types are not in all TypeScript DOM libs
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function useVoiceMode({ onDictate, onSend, onDictationEnd }: UseVoiceModeOptions = {}) {
  const [modeActive, setModeActive] = useState(false);
  const [modeState, setModeState] = useState<VoiceModeState>('idle');
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTextRef = useRef('');
  const onDictationEndRef = useRef(onDictationEnd);
  onDictationEndRef.current = onDictationEnd;

  const hasSTT = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopRecognition = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  }, []);

  const startDictation = useCallback(() => {
    if (!hasSTT) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setDictating(true);
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';

    let finalText = '';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      onDictate?.(finalText || interim);
    };

    rec.onend = () => {
      setDictating(false);
      onDictationEndRef.current?.();
    };

    rec.onerror = () => {
      setDictating(false);
      onDictationEndRef.current?.();
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setDictating(false);
    }
  }, [hasSTT, onDictate]);

  const stopDictation = useCallback(() => {
    stopRecognition();
    setDictating(false);
  }, [stopRecognition]);

  const toggleDictation = useCallback(() => {
    if (dictating) {
      stopDictation();
    } else {
      startDictation();
    }
  }, [dictating, stopDictation, startDictation]);

  const deactivateMode = useCallback(() => {
    stopRecognition();
    setModeActive(false);
    setModeState('idle');
  }, [stopRecognition]);

  const startModeListening = useCallback(() => {
    if (!modeActive || !hasSTT) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setModeState('listening');
    finalTextRef.current = '';

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTextRef.current += transcript;
        } else {
          interim += transcript;
        }
      }
      onDictate?.(finalTextRef.current || interim);

      if (finalTextRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          onSend?.();
          setModeState('thinking');
          try {
            rec.abort();
          } catch {
            /* ignore */
          }
        }, 1800);
      }
    };

    rec.onend = () => {
      if (finalTextRef.current && modeActive) {
        onSend?.();
        setModeState('thinking');
      } else if (modeActive) {
        setTimeout(() => {
          if (modeActive) startModeListening();
        }, 500);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (modeActive) {
          setTimeout(() => {
            if (modeActive) startModeListening();
          }, 800);
        }
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        deactivateMode();
        return;
      }
      if (modeActive) {
        setTimeout(() => {
          if (modeActive) startModeListening();
        }, 1500);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setTimeout(() => {
        if (modeActive) startModeListening();
      }, 1000);
    }
  }, [modeActive, hasSTT, onDictate, onSend, deactivateMode]);

  const toggleMode = useCallback(() => {
    if (modeActive) {
      deactivateMode();
    } else {
      setModeActive(true);
      setModeState('listening');
      // Delay slightly to allow state to propagate
      setTimeout(() => startModeListening(), 100);
    }
  }, [modeActive, deactivateMode, startModeListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, [stopRecognition]);

  return {
    hasSTT,
    hasTTS,
    modeActive,
    modeState,
    dictating,
    toggleDictation,
    toggleMode,
    deactivateMode,
    setModeState,
    stopDictation,
  };
}
