'use client';

import { useAtom } from 'jotai';
import { useCallback, useRef, useState, useEffect } from 'react';
import { approvalAtom, busyAtom, clarifyAtom, messagesAtom, yoloAtom } from '@/atoms/chat';
import { activeSessionAtom } from '@/atoms/session';
import { ApprovalCard } from '@/components/chat/approval-card';
import { ClarifyCard } from '@/components/chat/clarify-card';
import { LiveRunStatus } from '@/components/chat/live-run-status';
import { MessageList } from '@/components/chat/message-list';
import { SelectionReply } from '@/components/chat/selection-reply';
import { StreamingCursor } from '@/components/chat/streaming-cursor';
import { useChatStream } from '@/hooks/use-chat-stream';
import { apiPost } from '@/lib/api-client';
import { ComposerFooter } from './composer-footer';
import { TopBar } from './topbar';
import { ReconnectBanner, UpdateBanner, AgentHealthBanner } from '@/components/shared/system-banners';

function ScrollToBottomBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="scroll-to-bottom-btn" onClick={onClick} aria-label="Scroll to bottom" title="Scroll to bottom">
      <span aria-hidden="true">↓</span>
      <span className="session-jump-btn__text">End</span>
    </button>
  );
}

function JumpToStartBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="session-jump-btn session-jump-btn--start"
      onClick={onClick}
      aria-label="Jump to beginning of session"
      title="Jump to beginning of session"
    >
      <span aria-hidden="true">↑</span>
      <span className="session-jump-btn__text">Start</span>
    </button>
  );
}

export function MainPanel() {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [busy] = useAtom(busyAtom);
  const [activeSession] = useAtom(activeSessionAtom);
  const [approval, setApproval] = useAtom(approvalAtom);
  const [clarify, setClarify] = useAtom(clarifyAtom);
  const [, setYolo] = useAtom(yoloAtom);
  const messagesRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showJumpToStart, setShowJumpToStart] = useState(false);

  const sessionId = activeSession?.session_id ?? '';
  const { send, cancel } = useChatStream(sessionId);

  const handleQuote = useCallback((text: string) => {
    const textarea = document.querySelector<HTMLTextAreaElement>('[aria-label="Message input"]');
    if (textarea) {
      const quoted = `> ${text.split('\n').join('\n> ')}\n\n`;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textarea, quoted);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      textarea.focus();
    }
  }, []);

  const handleSend = (message: string, _attachments?: File[]) => {
    if (!sessionId) return;
    void send(message);
  };

  const handleCancel = () => {
    cancel();
  };

  const handleApprovalRespond = useCallback(
    async (approvalId: string, choice: 'once' | 'session' | 'always' | 'deny') => {
      try {
        await apiPost('/approval/respond', {
          session_id: sessionId,
          approval_id: approvalId,
          choice,
        });
        setApproval(null);
      } catch (err) {
        console.error('Failed to respond to approval:', err);
      }
    },
    [sessionId, setApproval],
  );

  const handleYoloToggle = useCallback(async () => {
    try {
      await apiPost('/session/yolo', { session_id: sessionId, enabled: true });
      setYolo(true);
      setApproval(null);
    } catch (err) {
      console.error('Failed to toggle YOLO:', err);
    }
  }, [sessionId, setYolo, setApproval]);

  const handleClarifyRespond = useCallback(
    async (clarifyId: string, response: string) => {
      try {
        await apiPost('/clarify/respond', {
          session_id: sessionId,
          clarify_id: clarifyId,
          response,
        });
        setClarify(null);
      } catch (err) {
        console.error('Failed to respond to clarify:', err);
      }
    },
    [sessionId, setClarify],
  );

  const handleEdit = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        await apiPost('/session/truncate', {
          session_id: sessionId,
          message_id: messageId,
        });
        void send(newContent);
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [sessionId, send],
  );

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      try {
        await apiPost('/session/retry', {
          session_id: sessionId,
          message_id: messageId,
        });
      } catch (err) {
        console.error('Failed to regenerate:', err);
      }
    },
    [sessionId],
  );

  const handleFork = useCallback(
    async (messageId: string) => {
      try {
        await apiPost('/session/branch', {
          session_id: sessionId,
          message_id: messageId,
        });
      } catch (err) {
        console.error('Failed to fork:', err);
      }
    },
    [sessionId],
  );

  const handleUndoExchange = useCallback(async () => {
    try {
      await apiPost('/session/undo-exchange', { session_id: sessionId });
      setMessages((prev) => {
        // Remove last user+assistant pair
        let lastAssistant = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === 'assistant') {
            lastAssistant = i;
            break;
          }
        }
        if (lastAssistant === -1) return prev;
        let lastUser = -1;
        for (let i = lastAssistant - 1; i >= 0; i--) {
          if (prev[i].role === 'user') {
            lastUser = i;
            break;
          }
        }
        if (lastUser === -1) return prev;
        return prev.filter((_, idx) => idx !== lastUser && idx !== lastAssistant);
      });
    } catch (err) {
      console.error('Failed to undo exchange:', err);
    }
  }, [sessionId, setMessages]);

  // Scroll jump controls
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!nearBottom && scrollHeight > clientHeight);
      setShowJumpToStart(scrollTop > 200);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [messages.length]);

  const scrollToBottom = () => {
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
  };
  const jumpToSessionStart = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      {messages.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center p-10"
          style={{
            background: 'radial-gradient(ellipse at 50% 20%, var(--accent-bg) 0%, transparent 60%)',
          }}
        >
          <div className="text-center flex flex-col items-center" style={{ gap: '12px', maxWidth: '380px' }}>
            <div className="mb-0 flex justify-center" style={{ marginBottom: '4px' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, var(--accent-bg), var(--accent-bg))',
                  border: '1px solid var(--accent-bg)',
                  boxShadow: '0 4px 20px var(--accent-bg)',
                }}
              >
                <svg width="40" height="40" viewBox="0 0 80 80" fill="none">
                  <defs>
                    <linearGradient id="hermes-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  <circle cx="40" cy="16" r="6" fill="url(#hermes-grad)" />
                  <path d="M40 22 L40 56" stroke="url(#hermes-grad)" strokeWidth="2.5" />
                  <path d="M28 36 Q40 30 52 36" stroke="url(#hermes-grad)" strokeWidth="2" fill="none" />
                  <path d="M28 44 Q40 38 52 44" stroke="url(#hermes-grad)" strokeWidth="2" fill="none" />
                  <path d="M30 56 L40 62 L50 56" stroke="url(#hermes-grad)" strokeWidth="2" fill="none" />
                  <path d="M24 14 L34 10" stroke="url(#hermes-grad)" strokeWidth="1.5" />
                  <path d="M56 14 L46 10" stroke="url(#hermes-grad)" strokeWidth="1.5" />
                  <circle cx="22" cy="14" r="2.5" fill="url(#hermes-grad)" />
                  <circle cx="58" cy="14" r="2.5" fill="url(#hermes-grad)" />
                </svg>
              </div>
            </div>
            <h2 className="text-[20px] font-bold text-[var(--text)]" style={{ letterSpacing: '-.02em' }}>
              What can I help with?
            </h2>
            <p className="text-sm text-[var(--muted)]" style={{ maxWidth: '320px' }}>
              Ask anything, run commands, explore files, or manage your scheduled tasks.
            </p>
            <div className="flex flex-col w-full" style={{ gap: '8px', marginTop: '12px' }}>
              {[
                {
                  icon: (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  ),
                  text: 'What files are in this workspace?',
                },
                {
                  icon: (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  ),
                  text: "What's on my schedule today?",
                },
                {
                  icon: (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                      <line x1="8" y1="2" x2="8" y2="18" />
                      <line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                  ),
                  text: 'Help me plan a small project.',
                },
              ].map((suggestion) => (
                <button
                  key={suggestion.text}
                  onClick={() => {
                    const textarea = document.querySelector<HTMLTextAreaElement>('[aria-label="Message input"]');
                    if (textarea) {
                      textarea.value = suggestion.text;
                      textarea.focus();
                      textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }}
                  className="flex items-center gap-2.5 text-left text-[13px] px-[14px] py-3 rounded-[10px] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-bg)] hover:border-[var(--accent-bg)] hover:translate-x-0.5 transition-all"
                  style={{ background: 'var(--input-bg, transparent)' }}
                >
                  {suggestion.icon}
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <UpdateBanner />
          <ReconnectBanner />
          <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto p-4">
            <div ref={messagesRef}>
              <MessageList
                onEdit={handleEdit}
                onRegenerate={handleRegenerate}
                onFork={handleFork}
                onUndoExchange={handleUndoExchange}
              />
            </div>
            <AgentHealthBanner />
            <LiveRunStatus />
            {busy && <StreamingCursor streaming={true} />}
            <SelectionReply containerRef={messagesRef} onQuote={handleQuote} />
          </div>

          {showJumpToStart && <JumpToStartBtn onClick={jumpToSessionStart} />}
          {showScrollToBottom && <ScrollToBottomBtn onClick={scrollToBottom} />}
        </div>
      )}

      <div className="relative shrink-0">
        {/* Composer flyout: approval / clarify / queue slide up from behind composer */}
        <div className="relative h-0 z-[1]">
          {approval && (
            <div className="absolute left-0 right-0 bottom-[-24px] mx-auto max-w-[var(--msg-max)] px-5 w-full overflow-hidden pointer-events-auto z-[3]">
              <div className="approval-flyout-inner">
                <ApprovalCard request={approval} onRespond={handleApprovalRespond} onYoloToggle={handleYoloToggle} />
              </div>
            </div>
          )}
          {clarify && (
            <div className="absolute left-0 right-0 bottom-[-24px] mx-auto max-w-[var(--msg-max)] px-5 w-full overflow-hidden pointer-events-auto z-[3]">
              <div className="clarify-flyout-inner">
                <ClarifyCard request={clarify} onRespond={handleClarifyRespond} />
              </div>
            </div>
          )}
        </div>
        <ComposerFooter onSend={handleSend} busy={busy} onCancel={handleCancel} sessionId={sessionId} />
      </div>
    </div>
  );
}
