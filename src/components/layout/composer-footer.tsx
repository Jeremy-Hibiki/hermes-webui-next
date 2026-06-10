'use client';

import { useAtom } from 'jotai';
import {
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Paperclip,
  Square,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { pendingFilesAtom, yoloAtom } from '@/atoms/chat';
import { activeProfileAtom, activeWorkspaceAtom, defaultModelAtom } from '@/atoms/settings';
import { ModelSelectorTrigger, ModelDropdownPopover } from '@/components/chat/model-selector';
import { SlashCommandMenu } from '@/components/chat/slash-command-menu';
import { ContextIndicator } from '@/components/chat/context-indicator';
import { apiUpload } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ComposerFooterProps {
  onSend: (message: string, attachments?: File[]) => void;
  busy: boolean;
  onCancel?: () => void;
  onAttach?: () => void;
  onVoice?: () => void;
  sendKey?: 'enter' | 'cmd-enter';
  sessionId?: string;
}

export function ComposerFooter({ onSend, busy, onCancel, sendKey = 'enter', sessionId }: ComposerFooterProps) {
  const DRAFT_KEY = 'hermes-composer-drafts';

  const getDraft = (sid: string): string => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      return map[sid] || '';
    } catch {
      return '';
    }
  };

  const saveDraft = (sid: string, val: string) => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      if (val) map[sid] = val;
      else delete map[sid];
      localStorage.setItem(DRAFT_KEY, JSON.stringify(map));
    } catch {}
  };

  const [text, setText] = useState(() => (sessionId ? getDraft(sessionId) : ''));
  const [pendingFiles, setPendingFiles] = useAtom(pendingFilesAtom);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [_uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile] = useAtom(activeProfileAtom);
  const [_model, setModel] = useAtom(defaultModelAtom);
  const [activeWorkspace, setActiveWorkspace] = useAtom(activeWorkspaceAtom);
  const [yolo, setYolo] = useAtom(yoloAtom);
  const [dragOver, setDragOver] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [wsDropdown, setWsDropdown] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [wsDropdownLeft, setWsDropdownLeft] = useState<number>(0);
  const [modelDropdownRight, setModelDropdownRight] = useState<number>(0);
  const { t: t18n } = useTranslation();
  const composerWrapRef = useRef<HTMLDivElement>(null);
  const wsChipRef = useRef<HTMLButtonElement>(null);
  const modelChipRef = useRef<HTMLButtonElement>(null);
  const wsDropdownRef = useRef<HTMLDivElement>(null);

  // Compute dropdown position relative to trigger chip
  const computeWsPosition = useCallback(() => {
    if (!wsChipRef.current || !composerWrapRef.current) return;
    const chipRect = wsChipRef.current.getBoundingClientRect();
    const wrapRect = composerWrapRef.current.getBoundingClientRect();
    setWsDropdownLeft(chipRect.left - wrapRect.left);
  }, []);

  const computeModelPosition = useCallback(() => {
    if (!modelChipRef.current || !composerWrapRef.current) return;
    const chipRect = modelChipRef.current.getBoundingClientRect();
    const wrapRect = composerWrapRef.current.getBoundingClientRect();
    setModelDropdownRight(wrapRect.right - chipRect.right);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    if (!wsDropdown && !modelDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (wsDropdown && wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setWsDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [wsDropdown, modelDropdownOpen]);

  const { data: wsData } = useSWR<{ workspaces: { name: string; path: string; active?: boolean }[]; active: string }>(
    '/workspaces',
    fetcher,
    { revalidateOnFocus: false },
  );
  const workspaces = wsData?.workspaces ?? [];
  const currentWsName = useMemo(() => {
    if (!wsData) return activeWorkspace || 'workspace';
    const active = workspaces.find((w) => w.active);
    return active?.name || wsData.active || activeWorkspace || 'workspace';
  }, [wsData, workspaces, activeWorkspace]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [text]);

  // Save draft when text changes
  useEffect(() => {
    if (sessionId) saveDraft(sessionId, text);
  }, [text, sessionId]);

  // Restore draft when session changes
  useEffect(() => {
    if (sessionId) setText(getDraft(sessionId));
  }, [sessionId]);

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

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) void handleFileSelect(new DataTransfer().files || new FileList());
          const dt = new DataTransfer();
          if (file) dt.items.add(file);
          void handleFileSelect(dt.files);
          return;
        }
      }
    },
    [handleFileSelect],
  );

  const hasContent = text.trim().length > 0;

  return (
    <div
      ref={composerWrapRef}
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
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--bg))',
        }}
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
            style={{
              background: 'linear-gradient(var(--input-bg), var(--input-bg)), var(--bg)',
            }}
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
            onPaste={handlePaste}
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
              className="w-[34px] h-[34px] flex items-center justify-center rounded-lg opacity-75 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] hover:opacity-100 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-[var(--border)] mx-[3px] shrink-0" />

            {/* Context indicator ring */}
            <ContextIndicator />

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
            <button
              onClick={() => {
                // Navigate to profiles panel for switching
                window.location.href = '/profiles';
              }}
              className="inline-flex items-center gap-2 max-w-[180px] px-2.5 py-2 rounded-full border border-transparent bg-transparent font-medium cursor-pointer text-[var(--muted)] hover:bg-[var(--hover-bg)] transition-colors text-xs"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate capitalize">{profile || 'default'}</span>
              <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
            </button>

            {/* Workspace chip - trigger only, dropdown is at footer level */}
            <button
              ref={wsChipRef}
              onClick={() => {
                computeWsPosition();
                setWsDropdown(!wsDropdown);
              }}
              className="inline-flex items-center gap-2 max-w-[284px] rounded-full border border-[var(--border2,var(--border))] bg-transparent hover:bg-[var(--hover-bg)] transition-colors overflow-hidden shrink-0"
            >
              <span className="inline-flex items-center justify-center px-3 py-2 text-[var(--muted)]">
                <FolderOpen className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs text-[var(--muted)] font-medium truncate">{currentWsName}</span>
              <ChevronDown
                className={cn('w-3 h-3 text-[var(--muted)] mr-2 transition-transform', wsDropdown && 'rotate-180')}
              />
            </button>

            {/* Model chip - trigger only, dropdown is at footer level */}
            <div ref={modelChipRef as unknown as React.RefObject<HTMLDivElement>}>
              <ModelSelectorTrigger
                model={_model}
                open={modelDropdownOpen}
                onToggle={() => {
                  computeModelPosition();
                  setModelDropdownOpen(!modelDropdownOpen);
                }}
              />
            </div>
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
                className="send-btn w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 transition-all"
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

      {/* Workspace dropdown - rendered at composer-wrap level to avoid overflow clipping */}
      {wsDropdown && (
        <div
          ref={wsDropdownRef}
          className="absolute bottom-full mb-1 w-56 max-h-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-[200] flex flex-col"
          style={{ left: wsDropdownLeft, boxShadow: '0 -4px 24px rgba(0,0,0,.4)' }}
        >
          <div className="px-2 py-1.5 text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide border-b border-[var(--border)]">
            Workspaces
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {workspaces.map((ws) => (
              <button
                key={ws.path}
                onClick={() => {
                  setActiveWorkspace(ws.path);
                  setWsDropdown(false);
                }}
                className={cn(
                  'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-[var(--hover-bg)] flex items-center gap-2 transition-colors',
                  (ws.active || ws.path === activeWorkspace) && 'text-[var(--accent)]',
                )}
              >
                <FolderOpen className="w-3 h-3 shrink-0" />
                <span className="truncate flex-1">{ws.name}</span>
                {(ws.active || ws.path === activeWorkspace) && <Check className="w-3 h-3 shrink-0" />}
              </button>
            ))}
            {workspaces.length === 0 && (
              <div className="px-2 py-3 text-xs text-[var(--muted)] text-center">No workspaces</div>
            )}
          </div>
        </div>
      )}

      {/* Model dropdown - rendered at composer-wrap level */}
      {modelDropdownOpen && (
        <ModelDropdownPopover
          selectedModel={_model}
          onSelect={(id) => {
            setModel(id);
            setModelDropdownOpen(false);
            try {
              localStorage.setItem('hermes-default-model', id);
            } catch {}
          }}
          onClose={() => setModelDropdownOpen(false)}
          style={{ right: modelDropdownRight }}
        />
      )}

      <style jsx>{`
        .composer-box:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px var(--accent-bg);
        }
        .send-btn:active {
          transform: scale(0.95) !important;
        }
      `}</style>
    </div>
  );
}
