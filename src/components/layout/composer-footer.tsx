"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { useAtom } from "jotai";
import { activeProfileAtom, defaultModelAtom } from "@/atoms/settings";
import { Send, Paperclip, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComposerFooterProps {
  onSend: (message: string, attachments?: File[]) => void;
  busy: boolean;
  onCancel?: () => void;
  onAttach?: () => void;
  onVoice?: () => void;
  sendKey?: "enter" | "cmd-enter";
}

export function ComposerFooter({
  onSend,
  busy,
  onCancel,
  onAttach,
  onVoice,
  sendKey = "enter",
}: ComposerFooterProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [profile] = useAtom(activeProfileAtom);
  const [model] = useAtom(defaultModelAtom);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setText("");
    setFiles([]);
  }, [text, busy, files, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (sendKey === "enter") {
        if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          handleSend();
        }
      } else {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSend();
        }
      }
    },
    [sendKey, handleSend]
  );

  return (
    <div className="border-t border-[var(--border)] bg-[var(--sidebar)] p-3">
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((f, i) => (
            <span key={i} className="text-xs bg-[var(--surface)] px-2 py-1 rounded">
              {f.name}
              <button
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="ml-1 text-[var(--muted)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Attach file"
          onClick={onAttach}
          className="text-[var(--muted)] hover:text-[var(--text)]"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <textarea
          ref={textareaRef}
          placeholder="Message Hermes..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        />

        <Button
          variant="ghost"
          size="icon"
          aria-label="Voice input"
          onClick={onVoice}
          className="text-[var(--muted)] hover:text-[var(--text)]"
        >
          <Mic className="w-4 h-4" />
        </Button>

        {busy ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cancel"
            onClick={onCancel}
            className="text-[var(--error)]"
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Send"
            onClick={handleSend}
            disabled={!text.trim()}
            className="text-[var(--accent)]"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted)]">
        {model && <span>{model}</span>}
        {profile !== "default" && <span className="capitalize">{profile}</span>}
      </div>
    </div>
  );
}
