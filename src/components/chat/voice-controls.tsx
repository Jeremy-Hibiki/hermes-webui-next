'use client';

import { useAtomValue } from 'jotai';
import { voiceModeEnabledAtom } from '@/atoms/settings';
import { useVoiceMode, type VoiceModeState } from '@/hooks/use-voice-mode';
import { Mic, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forwardRef, useImperativeHandle } from 'react';

export interface VoiceControlsHandle {
  stopDictation: () => void;
}

interface VoiceControlsProps {
  onDictate?: (text: string) => void;
  onSend?: () => void;
  onDictationEnd?: () => void;
}

function stateLabel(state: VoiceModeState): string {
  switch (state) {
    case 'listening':
      return 'Listening…';
    case 'thinking':
      return 'Thinking…';
    case 'speaking':
      return 'Speaking…';
    default:
      return '';
  }
}

function indicatorClass(state: VoiceModeState): string {
  switch (state) {
    case 'listening':
      return 'bg-[var(--error)] animate-pulse';
    case 'speaking':
      return 'bg-[var(--accent)] animate-pulse';
    case 'thinking':
      return 'bg-[var(--warning,#f59e0b)] animate-pulse';
    default:
      return 'bg-[var(--muted)]';
  }
}

export const VoiceControls = forwardRef<VoiceControlsHandle, VoiceControlsProps>(function VoiceControls(
  { onDictate, onSend, onDictationEnd },
  ref,
) {
  const voiceModeEnabled = useAtomValue(voiceModeEnabledAtom);
  const { hasSTT, modeActive, modeState, dictating, toggleDictation, toggleMode, stopDictation } = useVoiceMode({
    onDictate,
    onSend,
    onDictationEnd,
  });

  useImperativeHandle(
    ref,
    () => ({
      stopDictation,
    }),
    [stopDictation],
  );

  if (!hasSTT) return null;

  return (
    <>
      {/* Mic dictation button */}
      <button
        id="btnMic"
        onClick={toggleDictation}
        className={cn(
          'icon-btn mic-btn has-tooltip w-[34px] h-[34px] flex items-center justify-center rounded-lg opacity-75 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] hover:opacity-100 transition-colors',
          dictating && 'text-[var(--accent)] bg-[var(--accent-bg)] opacity-100',
        )}
        aria-label="Dictate"
        title="Dictate"
        data-tooltip="Dictate"
      >
        <Mic className="w-4 h-4" />
      </button>

      {/* Voice mode button */}
      {voiceModeEnabled && (
        <button
          id="btnVoiceMode"
          onClick={toggleMode}
          className={cn(
            'icon-btn voice-mode-btn has-tooltip w-[34px] h-[34px] flex items-center justify-center rounded-lg opacity-75 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] hover:opacity-100 transition-colors',
            modeActive && 'text-[var(--accent)] bg-[rgba(var(--accent-rgb,99,102,241),0.15)] opacity-100',
          )}
          aria-label="Voice mode"
          title="Voice mode"
          data-tooltip="Voice mode"
        >
          <AudioLines className="w-4 h-4" />
        </button>
      )}

      {/* Mic status */}
      {dictating && !modeActive && (
        <div
          id="micStatus"
          className="mic-status absolute bottom-full left-0 mb-1 flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] text-[var(--error)] bg-[var(--surface)] border border-[var(--border2)] z-[200]"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,.4)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)] animate-pulse" />
          Listening…
        </div>
      )}

      {/* Voice mode bar */}
      {modeActive && modeState !== 'idle' && (
        <div
          id="voiceModeBar"
          className="voice-mode-bar absolute bottom-full left-0 right-0 mb-1 flex items-center gap-2 px-3 py-1.5 text-[11px] border-b border-[rgba(255,255,255,0.05)] bg-[var(--surface)] rounded-lg z-[200]"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,.4)' }}
        >
          <span
            id="voiceModeIndicator"
            className={cn('voice-mode-indicator w-2 h-2 rounded-full', indicatorClass(modeState))}
          />
          <span id="voiceModeLabel" className="voice-mode-label text-[var(--muted)]">
            {stateLabel(modeState)}
          </span>
        </div>
      )}
    </>
  );
});
