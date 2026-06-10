'use client';

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type DragEvent } from 'react';
import { useAtom } from 'jotai';
import { activeProfileAtom, defaultModelAtom } from '@/atoms/settings';
import { pendingFilesAtom, yoloAtom } from '@/atoms/chat';
import { Paperclip, Square, X, Image as ImageIcon, FileText, ArrowUp, User, FolderOpen, Zap } from 'lucide-react';
import { apiUpload } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { ModelSelector } from '@/components/chat/model-selector';
import { SlashCommandMenu } from '@/components/chat/slash-command-menu';

interface ComposerFooterProps {
  onSend: (message: string, attachments?: File[]) => void;
  busy: boolean;
  onCancel?: () => void;
  onAttach?: () => void;
  onVoice?: () => void;
  sendKey?: 'enter' | 'cmd-enter';
}

export function ComposerFooter({ onSend, busy, onCancel, sendKey = 'enter' }: ComposerFooterProps) {
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useAtom(pendingFilesAtom);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [_uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile] = useAtom(activeProfileAtom);
  const [_model] = useAtom(defaultModelAtom);
  const [yolo, setYolo] = useAtom(yoloAtom);
  const [dragOver, setDragOver] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const { t: t18n } = useTranslation();

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (busy) return;
    onSend(trimmed);
    setText('');
    setPendingFiles([]);
    setUploadedPaths([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, busy, onSend, setPendingFiles]);

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
          formData.append('file', file);
          const result = await apiUpload<{ path: string }>('/upload', formData);
          setUploadedPaths((prev) => [...prev, result.path]);
        } catch (err) {
          console.error('Failed to upload file:', file.name, err);
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (sendKey === 'enter') {
        if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          handleSend();
        }
      } else {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSend();
        }
      }
    },
    [sendKey, handleSend],
  );

  const hasContent = text.trim().length > 0;

  return (
    <div
      className="composer-wrap relative shrink-0 px-5 pt-3 pb-4"
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
    >
      {/* Fade gradient above composer */}
      <div
        className="absolute left-0 right-0 bottom-full h-8 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }}
      />

      <div
        className={cn(
          'composer-box mx-auto flex flex-col relative z-[2] rounded-2xl border transition-all',
          dragOver && 'border-[var(--accent)]',
        )}
        style={{
          maxWidth: 'clamp(780px, 60vw, 1100px)',
          background: 'linear-gradient(var(--input-bg), var(--input-bg)), var(--bg)',
          borderColor: dragOver ? 'var(--accent)' : 'var(--border2, var(--border))',
          transition: 'border-color .2s, box-shadow .2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          aria-label="Attach files"
          className="absolute left-[-9999px] w-px h-px opacity-0 overflow-hidden"
          onChange={(e) => {
            void handleFileSelect(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Drop hint overlay */}
        {dragOver && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[var(--accent)] z-30 pointer-events-none"
            style={{ background: 'linear-gradient(var(--input-bg), var(--input-bg)), var(--bg)' }}
          >
            <Paperclip className="w-4 h-4 text-[var(--accent-text)]" />
            <span className="text-[13.5px] font-semibold text-[var(--accent-text)]">Drop files here</span>
          </div>
        )}

        {/* Attachment tray */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2.5 px-3.5">
            {pendingFiles.map((f, i) => {
              const key = `${f.name}-${f.size}`;
              const uploading = uploadingFiles.has(key);
              const isImage = f.type.startsWith('image/');
              return (
                <span
                  key={i}
                  className={cn(
                    'flex items-center gap-[5px] text-[11px] font-medium rounded-lg px-2.5 py-1',
                    isImage
                      ? 'bg-transparent border border-[var(--border)]'
                      : 'bg-[var(--accent-bg)] border border-[var(--accent-bg-strong,var(--accent-bg))] text-[var(--accent-text)]',
                  )}
                >
                  {isImage ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  {f.name}
                  {uploading && <span className="text-[var(--accent)] animate-pulse ml-0.5">↑</span>}
                  <button
                    onClick={() => handleRemoveFile(i)}
                    className="ml-0.5 text-[var(--muted)] hover:text-[var(--accent)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Slash command autocomplete */}
        <div className="relative">
          {showSlashMenu && (
            <SlashCommandMenu
              input={text}
              onSelect={(cmd) => {
                setText(cmd);
                setShowSlashMenu(false);
                textareaRef.current?.focus();
              }}
              onClose={() => setShowSlashMenu(false)}
            />
          )}
          <textarea
            aria-label="Message input"
            ref={textareaRef}
            placeholder={t18n('chat.placeholder')}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setShowSlashMenu(e.target.value.startsWith('/'));
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full bg-transparent border-none outline-none text-[var(--text)] text-base leading-[1.65] px-4 pt-3 pb-1.5 resize-none min-h-[44px] max-h-[200px] font-[inherit] placeholder:text-[var(--muted)]"
          />
        </div>

        {/* Composer footer: chips row */}
        <div className="flex items-center justify-between gap-2.5 px-2.5 pt-1.5 pb-2.5">
          <div
            className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Attach button */}
            <button
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-[var(--border)] mx-[3px] shrink-0" />

            {/* YOLO pill */}
            {yolo && (
              <button
                onClick={() => setYolo(false)}
                className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-bold uppercase tracking-[.04em] shrink-0 transition-all hover:-translate-y-px"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.35)',
                  lineHeight: 1.4,
                }}
              >
                <Zap className="w-3 h-3" />
                <span className="text-[10px]">YOLO</span>
              </button>
            )}

            {/* Profile chip */}
            <button className="inline-flex items-center gap-2 max-w-[180px] px-2.5 py-2 rounded-full border border-transparent bg-transparent font-medium cursor-pointer text-[var(--muted)] hover:bg-[var(--hover-bg)] transition-colors text-xs">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate capitalize">{profile || 'default'}</span>
            </button>

            {/* Workspace chip */}
            <button className="inline-flex items-center gap-2 max-w-[284px] rounded-full border border-[var(--border2,var(--border))] bg-transparent hover:bg-[var(--hover-bg)] transition-colors overflow-hidden shrink-0">
              <span className="inline-flex items-center justify-center px-3 py-2 text-[var(--muted)]">
                <FolderOpen className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs text-[var(--muted)] font-medium pr-3 truncate">workspace</span>
            </button>

            {/* Model chip */}
            <ModelSelector />
          </div>

          {/* Right side: send/stop */}
          <div className="flex items-center gap-2 shrink-0">
            {busy ? (
              <button
                onClick={onCancel}
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105"
                style={{
                  background: 'var(--error)',
                  color: '#fff',
                  boxShadow: '0 2px 10px rgba(0,0,0,.18)',
                }}
                aria-label="Stop"
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!hasContent}
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: hasContent ? 'var(--accent)' : 'var(--accent)',
                  color: '#fff',
                  opacity: hasContent ? 1 : 0.35,
                  boxShadow: hasContent ? '0 2px 8px var(--accent-bg-strong,var(--accent-bg))' : 'none',
                  cursor: hasContent ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => {
                  if (hasContent) e.currentTarget.style.transform = 'scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                }}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .composer-box:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px var(--accent-bg);
        }
      `}</style>
    </div>
  );
}
