'use client';

import { useState, useCallback, useRef } from 'react';

interface UseVoiceReturn {
  recording: boolean;
  transcript: string;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
}

export function useVoice(): UseVoiceReturn {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (globalThis as Record<string, unknown>).SpeechRecognition ||
      (globalThis as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      return;
    }

    const recognition = new (SpeechRecognition as new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: { results: { transcript: string }[][] }) => void) | null;
      onerror: ((e: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
      abort: () => void;
    })();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e: { results: { transcript: string }[][] }) => {
      const text = e.results?.[0]?.[0]?.transcript ?? '';
      setTranscript(text);
      setRecording(false);
    };

    recognition.onerror = (e: { error: string }) => {
      setError(e.error);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setTranscript('');
    setError(null);
  }, []);

  const stopRecording = useCallback(() => {
    const rec = recognitionRef.current as { stop?: () => void } | null;
    rec?.stop?.();
    setRecording(false);
  }, []);

  return { recording, transcript, error, startRecording, stopRecording };
}
