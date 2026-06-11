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
import { fetcher, apiPost } from '@/lib/api-client';
import { pendingFilesAtom, yoloAtom, activeStreamIdAtom, clarifyAtom, messagesAtom } from '@/atoms/chat';
import { workspacePanelOpenAtom } from '@/atoms/ui';
import { activeProfileAtom, activeWorkspaceAtom, defaultModelAtom, busyInputModeAtom } from '@/atoms/settings';
import { queueSessionMessage, getSessionQueue } from '@/atoms/streaming';
import { parseCommand } from '@/lib/commands';
import { toast } from '@/components/ui/toast';
import { ModelSelectorTrigger, ModelDropdownPopover, useModels } from '@/components/chat/model-selector';
import { SlashCommandMenu } from '@/components/chat/slash-command-menu';
import { ContextIndicator } from '@/components/chat/context-indicator';
import { ReasoningChip } from '@/components/chat/reasoning-chip';
import { ProviderQuotaChip } from '@/components/chat/provider-quota-chip';
import { BackgroundTasksBadge } from '@/components/chat/background-tasks-badge';
import { MobileComposerConfigButton } from '@/components/chat/mobile-composer-config';
import { ToolsetsChip } from '@/components/chat/toolsets-chip';
import { VoiceControls, type VoiceControlsHandle } from '@/components/chat/voice-controls';
import { apiUpload } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function HiddenModelSelect({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const models = useModels();
  return (
    <select
      id="modelSelect"
      aria-hidden="true"
      tabIndex={-1}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="absolute left-0 top-0 w-px h-px opacity-0 overflow-hidden pointer-events-none"
      style={{ clip: 'rect(0 0 0 0)' }}
    >
      <option value="">System default</option>
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

type ComposerAction = 'send' | 'stop' | 'queue' | 'interrupt' | 'steer' | 'disabled';

interface ComposerFooterProps {
  onSend: (message: string, attachments?: string[]) => void;
  busy: boolean;
  onCancel?: () => void;
  onSteer?: (message: string) => Promise<boolean>;
  onAttach?: () => void;
  onVoice?: () => void;
  sendKey?: 'enter' | 'cmd-enter';
  sessionId?: string;
  compressionRunning?: boolean;
}

export function ComposerFooter({
  onSend,
  busy,
  onCancel,
  onSteer,
  sendKey = 'enter',
  sessionId,
  compressionRunning,
}: ComposerFooterProps) {
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setActiveProfile] = useAtom(activeProfileAtom);
  const [defaultModel, setDefaultModel] = useAtom(defaultModelAtom);
  const [activeWorkspace, setActiveWorkspace] = useAtom(activeWorkspaceAtom);
  const [yolo, setYolo] = useAtom(yoloAtom);
  const [workspaceOpen, setWorkspaceOpen] = useAtom(workspacePanelOpenAtom);
  const [busyInputMode] = useAtom(busyInputModeAtom);
  const [activeStreamId] = useAtom(activeStreamIdAtom);
  const [clarify] = useAtom(clarifyAtom);
  const [, setMessages] = useAtom(messagesAtom);
  const [_queueCount, setQueueCount] = useState(0);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const prevActionRef = useRef<ComposerAction>('disabled');
  const voiceControlsRef = useRef<VoiceControlsHandle>(null);
  const micPendingSendRef = useRef(false);
  const micActiveRef = useRef(false);
  const primaryActionInProgressRef = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [wsDropdown, setWsDropdown] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [wsDropdownLeft, setWsDropdownLeft] = useState<number>(0);
  const [modelDropdownRight, setModelDropdownRight] = useState<number>(0);
  const [profileDropdownLeft, setProfileDropdownLeft] = useState<number>(0);
  const { t: t18n } = useTranslation();
  const composerWrapRef = useRef<HTMLDivElement>(null);
  const wsChipRef = useRef<HTMLButtonElement>(null);
  const modelChipRef = useRef<HTMLButtonElement>(null);
  const profileChipRef = useRef<HTMLButtonElement>(null);
  const wsDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

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

  const computeProfilePosition = useCallback(() => {
    if (!profileChipRef.current || !composerWrapRef.current) return;
    const chipRect = profileChipRef.current.getBoundingClientRect();
    const wrapRect = composerWrapRef.current.getBoundingClientRect();
    setProfileDropdownLeft(chipRect.left - wrapRect.left);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    if (!wsDropdown && !modelDropdownOpen && !profileDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (wsDropdown && wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setWsDropdown(false);
      }
      if (profileDropdownOpen && profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [wsDropdown, modelDropdownOpen, profileDropdownOpen]);

  const { data: wsData } = useSWR<{ workspaces: { name: string; path: string; active?: boolean }[]; active: string }>(
    '/workspaces',
    fetcher,
    { revalidateOnFocus: false },
  );
  const workspaces = wsData?.workspaces ?? [];

  const { data: profilesData, mutate: mutateProfiles } = useSWR<{
    profiles: { name: string; model?: string; provider?: string }[];
    active: string;
  }>('/profiles', fetcher, { revalidateOnFocus: false });
  const profiles = profilesData?.profiles ?? [];
  const activeProfileName = profilesData?.active ?? profile ?? 'default';

  const handleProfileSwitch = useCallback(
    async (name: string) => {
      if (name === activeProfileName) {
        setProfileDropdownOpen(false);
        return;
      }
      try {
        const res = await apiPost<{ active: string; default_model?: string }>('/profile/switch', { name });
        setActiveProfile(res.active);
        if (res.default_model) setDefaultModel(res.default_model);
        void mutateProfiles();
      } catch {
        /* ignore */
      }
      setProfileDropdownOpen(false);
    },
    [activeProfileName, setActiveProfile, setDefaultModel, mutateProfiles],
  );
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

  // Save server-side draft before locking composer for clarify
  useEffect(() => {
    if (!clarify || !sessionId) return;
    const ta = textareaRef.current;
    const currentText = ta?.value || text || '';
    apiPost('/api/session/draft', {
      session_id: sessionId,
      text: currentText,
      files: pendingFiles.map((f) => (typeof f === 'string' ? f : f.name)),
    }).catch(() => {});
  }, [clarify, sessionId]);

  // Refresh queue count when session changes or periodically
  useEffect(() => {
    if (!sessionId) {
      setQueueCount(0);
      return;
    }
    const update = () => setQueueCount(getSessionQueue(sessionId).length);
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [sessionId]);

  // Explicit slash-command override (/steer, /interrupt, /queue)
  const explicitAction = useMemo<ComposerAction | null>(() => {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return null;
    const body = trimmed.slice(1);
    const name = (body.split(/\s+/)[0] || '').toLowerCase();
    const args = body.slice(name.length).trim();
    if (!args) return null;
    if (name === 'queue') return 'queue';
    if (name === 'steer') {
      if (activeStreamId && onSteer) return 'steer';
      return 'queue';
    }
    if (name === 'interrupt') {
      if (activeStreamId && onCancel) return 'interrupt';
      return 'queue';
    }
    return null;
  }, [text, activeStreamId, onSteer, onCancel]);

  const action: ComposerAction = useMemo(() => {
    const hasContent = text.trim().length > 0;
    if (clarify) return 'disabled';
    if (compressionRunning) return hasContent ? 'queue' : 'disabled';
    if (!busy) return hasContent ? 'send' : 'disabled';
    if (!hasContent) {
      if (activeStreamId && onCancel) return 'stop';
      return 'disabled';
    }
    if (explicitAction) return explicitAction;
    const mode = busyInputMode || 'queue';
    if (mode === 'steer') {
      if (activeStreamId && onSteer) return 'steer';
      return 'queue';
    }
    if (mode === 'interrupt') {
      if (activeStreamId && onCancel) return 'interrupt';
      return 'queue';
    }
    return 'queue';
  }, [text, busy, activeStreamId, busyInputMode, onCancel, onSteer, clarify, explicitAction, compressionRunning]);

  // Send button visible-class toggle: animate whenever action transitions from disabled -> active
  useEffect(() => {
    const btn = sendBtnRef.current;
    if (!btn) return;
    const wasDisabled = prevActionRef.current === 'disabled';
    const isDisabled = action === 'disabled';
    prevActionRef.current = action;
    if (!isDisabled && wasDisabled) {
      btn.classList.remove('send-btn-pop');
      requestAnimationFrame(() => btn.classList.add('send-btn-pop'));
    } else if (isDisabled) {
      btn.classList.remove('send-btn-pop');
    }
  }, [action]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed, _uploadedPaths.length > 0 ? _uploadedPaths : undefined);
    setText('');
    setPendingFiles([]);
    setUploadedPaths([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, onSend, setPendingFiles, _uploadedPaths]);

  const handlePrimaryAction = useCallback(async () => {
    if (primaryActionInProgressRef.current) return;
    primaryActionInProgressRef.current = true;
    try {
      const trimmed = text.trim();

      // Mic pending-send guard: if dictating, stop mic and defer send until it ends
      if (micActiveRef.current) {
        micPendingSendRef.current = true;
        voiceControlsRef.current?.stopDictation();
        return;
      }

      // Slash-command interception (both busy and non-busy)
      const cmd = parseCommand(trimmed);
      if (cmd && (cmd.name === 'terminal' || cmd.name === 'goal')) {
        setText('');
        setPendingFiles([]);
        setUploadedPaths([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        if (cmd.name === 'terminal') {
          toast('Terminal — use the workspace panel toggle', 'info');
        } else if (cmd.name === 'goal' && sessionId) {
          try {
            const res = await apiPost<{ goal_text?: string; goal_status?: string; error?: string }>('/api/goal', {
              session_id: sessionId,
              command: cmd.args[0] || 'status',
              text: cmd.args.slice(1).join(' ') || undefined,
            });
            if (res.error) {
              toast(res.error, 'error');
            } else {
              if (res.goal_text) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `goal-${Date.now()}`,
                    role: 'assistant',
                    content: `**Goal:** ${res.goal_text}`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
              if (res.goal_status) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `goal-status-${Date.now()}`,
                    role: 'assistant',
                    content: `**Goal status:** ${res.goal_status}`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            }
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Goal request failed', 'error');
          }
        }
        return;
      }

      if (action === 'disabled') return;
      if (action === 'stop') {
        onCancel?.();
        return;
      }
      if (action === 'send') {
        // Guard against race where busy flipped after action was computed
        if (busy) {
          if (sessionId) {
            queueSessionMessage(sessionId, {
              text: trimmed,
              files: pendingFiles,
              attachments: _uploadedPaths.length > 0 ? _uploadedPaths : undefined,
              profile: profile || 'default',
            });
            setText('');
            setPendingFiles([]);
            setUploadedPaths([]);
            setQueueCount(getSessionQueue(sessionId).length);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
          }
          return;
        }
        handleSend();
        return;
      }
      if (!sessionId) return;
      if (action === 'steer') {
        if (onSteer) {
          const accepted = await onSteer(trimmed);
          if (accepted) {
            setText('');
            setPendingFiles([]);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            return;
          }
        }
        // Fall back to interrupt+queue
        queueSessionMessage(sessionId, {
          text: trimmed,
          files: pendingFiles,
          attachments: _uploadedPaths.length > 0 ? _uploadedPaths : undefined,
          profile: profile || 'default',
        });
        setText('');
        setPendingFiles([]);
        setUploadedPaths([]);
        setQueueCount(getSessionQueue(sessionId).length);
        onCancel?.();
        return;
      }
      if (action === 'interrupt') {
        queueSessionMessage(sessionId, {
          text: trimmed,
          files: pendingFiles,
          attachments: _uploadedPaths.length > 0 ? _uploadedPaths : undefined,
          profile: profile || 'default',
        });
        setText('');
        setPendingFiles([]);
        setUploadedPaths([]);
        setQueueCount(getSessionQueue(sessionId).length);
        onCancel?.();
        return;
      }
      if (action === 'queue') {
        queueSessionMessage(sessionId, {
          text: trimmed,
          files: pendingFiles,
          attachments: _uploadedPaths.length > 0 ? _uploadedPaths : undefined,
          profile: profile || 'default',
        });
        setText('');
        setPendingFiles([]);
        setUploadedPaths([]);
        setQueueCount(getSessionQueue(sessionId).length);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        return;
      }
    } finally {
      primaryActionInProgressRef.current = false;
    }
  }, [
    action,
    text,
    sessionId,
    busy,
    onCancel,
    onSteer,
    handleSend,
    pendingFiles,
    setPendingFiles,
    _uploadedPaths,
    profile,
    setMessages,
  ]);

  const handleFileSelect = useCallback(
    async (files: File[] | FileList | null) => {
      if (!files) return;
      const newFiles = Array.isArray(files) ? files : Array.from(files);
      setPendingFiles((prev) => [...prev, ...newFiles]);
      setUploadProgress(0);
      const total = newFiles.length;
      for (let i = 0; i < total; i++) {
        const file = newFiles[i];
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
          setUploadProgress(Math.round(((i + 1) / total) * 100));
        }
      }
      setTimeout(() => setUploadProgress(0), 600);
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

  // Recursively read dropped directories using webkitGetAsEntry
  const collectDroppedFiles = useCallback(async (e: DragEvent): Promise<File[]> => {
    const items = e.dataTransfer?.items;
    if (!items || items.length === 0) {
      return Array.from(e.dataTransfer?.files ?? []);
    }
    const files: File[] = [];
    const readEntry = (entry: FileSystemEntry): Promise<void> =>
      new Promise((resolve) => {
        if (entry.isFile) {
          (entry as FileSystemFileEntry).file(
            (f) => {
              files.push(f);
              resolve();
            },
            () => resolve(),
          );
        } else if (entry.isDirectory) {
          const dirReader = (entry as FileSystemDirectoryEntry).createReader();
          const readBatch = () => {
            dirReader.readEntries(
              async (entries) => {
                if (entries.length === 0) {
                  resolve();
                  return;
                }
                await Promise.all(entries.map((ent) => readEntry(ent)));
                readBatch(); // continue reading until empty
              },
              () => resolve(),
            );
          };
          readBatch();
        } else {
          resolve();
        }
      });

    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    await Promise.all(entries.map((e) => readEntry(e)));
    return files;
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = await collectDroppedFiles(e);
      void handleFileSelect(files);
    },
    [handleFileSelect, collectDroppedFiles],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (sendKey === 'enter') {
        if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          void handlePrimaryAction();
        }
      } else {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void handlePrimaryAction();
        }
      }
    },
    [sendKey, handlePrimaryAction],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const dt = new DataTransfer();
            dt.items.add(file);
            void handleFileSelect(dt.files);
          }
          return;
        }
      }
    },
    [handleFileSelect],
  );

  return (
    <div
      id="composerWrap"
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
        id="composerBox"
        className={cn(
          'composer-box mx-auto flex flex-col relative z-[2] rounded-2xl border transition-all',
          dragOver && 'border-[var(--accent)] drag-over',
        )}
        style={{
          maxWidth: 'clamp(780px, 60vw, 1100px)',
          background: 'linear-gradient(var(--input-bg), var(--input-bg)), var(--bg)',
          borderColor: dragOver ? 'var(--accent)' : 'var(--border2, var(--border))',
          transition: 'border-color .2s, box-shadow .2s',
        }}
      >
        <input
          id="fileInput"
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,text/*,application/pdf,application/json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.md,.py,.js,.ts,.yaml,.yml,.toml,.csv,.sh,.txt,.log,.env,.xls,.xlsx,.doc,.docx,.zip,.tar,.gz,.tgz,.bz2,.xz"
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
            id="dropHint"
            className="drop-hint absolute inset-0 flex items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[var(--accent)] z-30 pointer-events-none"
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
          <div id="attachTray" className="attach-tray flex flex-wrap gap-1.5 pt-2.5 px-3.5">
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
            id="msg"
            aria-label="Message input"
            ref={textareaRef}
            placeholder={clarify ? 'Respond to the clarification request…' : t18n('chat.placeholder')}
            value={text}
            disabled={!!clarify}
            onChange={(e) => {
              setText(e.target.value);
              setShowSlashMenu(e.target.value.startsWith('/'));
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            className="w-full bg-transparent border-none outline-none text-[var(--text)] text-base leading-[1.65] px-4 pt-3 pb-1.5 resize-none min-h-[44px] max-h-[200px] font-[inherit] placeholder:text-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Composer footer: chips row */}
        <div
          id="composerFooter"
          className="composer-footer flex items-center justify-between gap-2.5 px-2.5 pt-1.5 pb-2.5"
        >
          <div
            className="composer-left flex items-center gap-1 min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Attach button */}
            <button
              id="btnAttach"
              aria-label="Attach file"
              data-tooltip="Attach file"
              onClick={() => fileInputRef.current?.click()}
              className="icon-btn has-tooltip w-[34px] h-[34px] flex items-center justify-center rounded-lg opacity-75 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] hover:opacity-100 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Mic / Voice mode controls */}
            <VoiceControls
              ref={voiceControlsRef}
              onDictate={(txt) => {
                setText(txt);
                if (textareaRef.current) {
                  textareaRef.current.value = txt;
                }
              }}
              onSend={() => void handlePrimaryAction()}
              onDictationEnd={() => {
                micActiveRef.current = false;
                if (micPendingSendRef.current) {
                  micPendingSendRef.current = false;
                  void handlePrimaryAction();
                }
              }}
            />

            {/* Divider */}
            <div aria-hidden="true" className="composer-divider w-px h-4 bg-[var(--border)] mx-[3px] shrink-0" />

            {/* YOLO pill */}
            {yolo && (
              <button
                id="yoloPill"
                onClick={() => setYolo(false)}
                title={t18n('yolo_pill_title_active')}
                className="yolo-pill inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-bold uppercase tracking-[.04em] shrink-0 transition-all hover:-translate-y-px"
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
            <div className="composer-profile-wrap relative flex-shrink-0">
              <button
                id="profileChip"
                ref={profileChipRef}
                onClick={() => {
                  computeProfilePosition();
                  setProfileDropdownOpen((v) => !v);
                }}
                title={t18n('profile_switch_title')}
                className={cn(
                  'composer-profile-chip inline-flex items-center gap-2 max-w-[180px] pl-3 pr-2.5 py-2 rounded-full border border-transparent bg-transparent font-medium cursor-pointer transition-colors text-xs',
                  'hover:text-[var(--text)] hover:bg-[var(--hover-bg)]',
                  profileDropdownOpen && 'text-[var(--text)] bg-[var(--accent-bg)] border-[var(--accent-bg)] switching',
                )}
                style={{ color: profileDropdownOpen ? undefined : 'var(--muted)' }}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span id="profileChipLabel" className="truncate capitalize">
                  {activeProfileName}
                </span>
                <ChevronDown
                  className={cn('w-3 h-3 shrink-0 transition-transform', profileDropdownOpen && 'rotate-180')}
                />
              </button>

              {profileDropdownOpen && (
                <div
                  id="profileDropdown"
                  ref={profileDropdownRef}
                  className="composer-profile-dropdown absolute bottom-[calc(100%+4px)] left-0 min-w-[160px] max-h-48 overflow-hidden rounded-[10px] border border-[var(--border2)] bg-[var(--surface)] z-[200] p-1"
                  style={{ left: profileDropdownLeft, boxShadow: '0 -4px 24px rgba(0,0,0,.4)' }}
                >
                  <div className="overflow-y-auto max-h-44 p-0.5">
                    {profiles.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => void handleProfileSwitch(p.name)}
                        className={cn(
                          'w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-[13px] whitespace-nowrap transition-colors cursor-pointer',
                          'hover:bg-[rgba(255,255,255,0.07)]',
                          p.name === activeProfileName && 'bg-[var(--accent-bg)] text-[var(--accent)]',
                          p.name !== activeProfileName && 'text-[var(--text)]',
                        )}
                      >
                        <span className="w-3.5 shrink-0 flex items-center justify-center">
                          {p.name === activeProfileName && <Check className="w-3 h-3" />}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                    {profiles.length === 0 && (
                      <div className="px-3 py-2 text-xs text-[var(--muted)] text-center">No profiles</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Workspace group: files toggle + workspace switcher */}
            <div
              id="composerWorkspaceGroup"
              className="composer-workspace-group inline-flex items-stretch max-w-[284px] rounded-full overflow-hidden shrink-0 border border-[var(--border2,var(--border))] hover:bg-[var(--hover-bg)] transition-colors"
              role="group"
              aria-label="Workspace controls"
            >
              <button
                id="btnWorkspacePanelToggle"
                onClick={() => setWorkspaceOpen((v) => !v)}
                className={cn(
                  'composer-workspace-files-btn inline-flex items-center justify-center pl-3 pr-2.5 py-2 bg-transparent border-none cursor-pointer transition-colors',
                  workspaceOpen ? 'text-[var(--accent-text)] bg-[var(--accent-bg)]' : 'text-[var(--muted)]',
                )}
                aria-label="Toggle workspace files panel"
                title="Toggle workspace files panel"
                aria-pressed={workspaceOpen}
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
              <button
                id="composerWorkspaceChip"
                ref={wsChipRef}
                onClick={() => {
                  computeWsPosition();
                  setWsDropdown(!wsDropdown);
                }}
                disabled={workspaces.length === 0}
                title={t18n('workspace_switch_title')}
                className="composer-workspace-chip inline-flex items-center gap-2 min-w-0 max-w-[200px] pl-2.5 pr-3 py-2 bg-transparent border-none border-l border-transparent cursor-pointer text-[var(--muted)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span id="composerWorkspaceLabel" className="text-xs truncate">
                  {currentWsName}
                </span>
                <ChevronDown className={cn('w-3 h-3 transition-transform', wsDropdown && 'rotate-180')} />
              </button>
            </div>

            {/* Reasoning effort chip */}
            <div id="composerReasoningWrap" className="composer-reasoning-wrap relative flex-shrink-0">
              <ReasoningChip />
            </div>

            {/* Toolsets chip */}
            <div id="composerToolsetsWrap" className="composer-toolsets-wrap relative flex-shrink-0">
              <ToolsetsChip />
            </div>

            {/* Model chip - trigger only, dropdown is at footer level */}
            <div
              id="composerModelWrap"
              ref={modelChipRef as unknown as React.RefObject<HTMLDivElement>}
              className="composer-model-wrap relative flex-shrink-0"
            >
              <ModelSelectorTrigger
                id="composerModelChip"
                model={defaultModel}
                open={modelDropdownOpen}
                onToggle={() => {
                  computeModelPosition();
                  setModelDropdownOpen(!modelDropdownOpen);
                }}
              />
              <HiddenModelSelect value={defaultModel} onChange={setDefaultModel} />
            </div>

            {/* Provider quota chip */}
            <div id="providerQuotaChip" className="provider-quota-chip-wrap relative flex-shrink-0">
              <ProviderQuotaChip />
            </div>

            {/* Mobile composer config button — visible only on narrow screens */}
            <div id="composerMobileConfigBtn" className="composer-mobile-config-wrap relative flex-shrink-0">
              <MobileComposerConfigButton
                onOpenWorkspace={() => {
                  computeWsPosition();
                  setWsDropdown(true);
                }}
                onOpenModel={() => {
                  computeModelPosition();
                  setModelDropdownOpen(true);
                }}
                onOpenReasoning={() => {
                  // Scroll to reasoning chip or open its dropdown
                  const chip = document.getElementById('composerReasoningChip');
                  chip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  chip?.click();
                }}
              />
            </div>
          </div>

          {/* Right side: status, context, bg badge, send/stop */}
          <div className="composer-right flex items-center gap-2 shrink-0">
            {/* Composer status text */}
            {busy && (
              <span id="composerStatus" className="hidden sm:inline text-[11px] text-[var(--muted)] mr-1">
                {t18n('composer.status_sending')}
              </span>
            )}

            {/* Context indicator ring */}
            <ContextIndicator />

            {/* Background tasks badge */}
            <BackgroundTasksBadge />

            <button
              ref={sendBtnRef}
              id="btnSend"
              onClick={() => void handlePrimaryAction()}
              disabled={action === 'disabled'}
              data-action={action}
              className={cn(
                'send-btn w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-35 disabled:cursor-not-allowed',
                (action === 'send' || action === 'queue') && 'hover:scale-[1.08]',
                (action === 'stop' || action === 'interrupt') && 'hover:scale-[1.06]',
                action === 'steer' && 'hover:scale-[1.06]',
              )}
              style={{
                background:
                  action === 'stop' || action === 'interrupt'
                    ? 'var(--error)'
                    : action === 'steer'
                      ? 'var(--purple, #8b5cf6)'
                      : 'var(--accent)',
                color: '#fff',
                boxShadow:
                  action === 'disabled'
                    ? 'none'
                    : action === 'stop' || action === 'interrupt'
                      ? '0 2px 10px rgba(0,0,0,.18)'
                      : action === 'steer'
                        ? '0 2px 10px rgba(139,92,246,.25)'
                        : '0 2px 8px var(--accent-bg-strong,var(--accent-bg))',
              }}
              aria-label={
                action === 'stop'
                  ? t18n('chat.stop')
                  : action === 'queue'
                    ? 'Queue message'
                    : action === 'interrupt'
                      ? 'Interrupt and queue'
                      : action === 'steer'
                        ? 'Steer'
                        : t18n('chat.send')
              }
              title={
                action === 'stop'
                  ? t18n('chat.stop')
                  : action === 'queue'
                    ? 'Queue message'
                    : action === 'interrupt'
                      ? 'Interrupt and queue'
                      : action === 'steer'
                        ? 'Steer'
                        : t18n('chat.send')
              }
            >
              {action === 'stop' && <Square className="w-4 h-4" fill="currentColor" />}
              {action === 'send' && <ArrowUp className="w-4 h-4" />}
              {action === 'disabled' && <ArrowUp className="w-4 h-4" />}
              {action === 'queue' && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 5H3" />
                  <path d="M16 12H3" />
                  <path d="M9 19H3" />
                  <path d="m16 16-3 3 3 3" />
                  <path d="M21 5v12a2 2 0 0 1-2 2h-6" />
                </svg>
              )}
              {action === 'interrupt' && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 4v16" />
                  <path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" />
                </svg>
              )}
              {action === 'steer' && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Upload progress bar */}
        {uploadProgress > 0 && (
          <div className="h-[3px] bg-[var(--hover-bg)] rounded-b-2xl overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${uploadProgress}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))',
                transition: 'width .3s ease',
              }}
            />
          </div>
        )}
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
          selectedModel={defaultModel}
          onSelect={(id) => {
            setDefaultModel(id);
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
        .composer-left::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
