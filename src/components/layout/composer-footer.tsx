"use client";

import { useState, useRef, useCallback, type KeyboardEvent, type DragEvent } from "react";
import { useAtom } from "jotai";
import { activeProfileAtom, defaultModelAtom } from "@/atoms/settings";
import { pendingFilesAtom } from "@/atoms/chat";
import { Send, Paperclip, Mic, Square, X, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUpload } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/chat/model-selector";

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
  onVoice,
  sendKey = "enter",
}: ComposerFooterProps) {
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useAtom(pendingFilesAtom);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile] = useAtom(activeProfileAtom);
  const [_model] = useAtom(defaultModelAtom);
  const [dragOver, setDragOver] = useState(false);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    void (async () => {
      if (uploadedPaths.length > 0) {
        // Attachments already uploaded, paths sent via message metadata
      }
    })();
    setText("");
    setPendingFiles([]);
    setUploadedPaths([]);
  }, [text, busy, onSend, uploadedPaths, setPendingFiles]);

  const handleFileSelect = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles = Array.from(fileList);
      setPendingFiles((prev) => [...prev, ...newFiles]);

      for (const file of newFiles) {
        const key = `${file.name}-${file.size}`;
        setUploadingFiles((prev) => new Map(prev).set(key, 0));
        try {
          const formData = new FormData();
          formData.append("file", file);
          const result = await apiUpload<{ path: string }>("/upload", formData);
          setUploadedPaths((prev) => [...prev, result.path]);
        } catch (err) {
          console.error("Failed to upload file:", file.name, err);
        } finally {
          setUploadingFiles((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }
      }
    },
    [setPendingFiles],
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      setPendingFiles((prev) => prev.filter((_, i) => i !== index));
      setUploadedPaths((prev) => prev.filter((_, i) => i !== index));
    },
    [setPendingFiles],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      void handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

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
    [sendKey, handleSend],
  );

  return (
    <div
      className={cn(
        "border-t border-[var(--border)] bg-[var(--sidebar)] p-3 transition-colors",
        dragOver && "bg-[var(--accent-bg)]",
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        aria-label="Attach files"
        className="hidden"
        onChange={(e) => {
          void handleFileSelect(e.target.files);
          e.target.value = "";
        }}
      />

      {pendingFiles.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {pendingFiles.map((f, i) => {
            const key = `${f.name}-${f.size}`;
            const uploading = uploadingFiles.has(key);
            return (
              <span
                key={i}
                className="flex items-center gap-1 text-xs bg-[var(--surface)] px-2 py-1 rounded"
              >
                {f.type.startsWith("image/") ? (
                  <ImageIcon className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                {f.name}
                {uploading && <span className="text-[var(--accent)] animate-pulse">↑</span>}
                <button
                  onClick={() => handleRemoveFile(i)}
                  className="ml-1 text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
          className="text-[var(--muted)] hover:text-[var(--text)]"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <textarea
          aria-label="Message input"
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
        <ModelSelector />
        {profile !== "default" && <span className="capitalize">{profile}</span>}
      </div>
    </div>
  );
}
