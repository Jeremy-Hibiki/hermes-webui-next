'use client';

import { useState, useEffect, useRef } from 'react';
import type { ClarifyRequest } from '@/types';
import { HelpCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClarifyCardProps {
  request: ClarifyRequest;
  onRespond: (clarifyId: string, response: string) => void;
}

export function ClarifyCard({ request, onRespond }: ClarifyCardProps) {
  const [draft, setDraft] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (request.expires_at) {
      const expires = new Date(request.expires_at).getTime();
      const interval = setInterval(() => {
        const left = Math.max(0, Math.floor((expires - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
    if (request.timeout_seconds) {
      const seconds = request.timeout_seconds;
      setRemaining(seconds);
      const interval = setInterval(() => {
        setRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [request.expires_at, request.timeout_seconds]);

  const handleChoiceClick = (choice: string) => {
    setSubmitted(true);
    onRespond(request.clarify_id || request.id, choice);
  };

  const handleSubmit = () => {
    if (!draft.trim()) return;
    setSubmitted(true);
    onRespond(request.clarify_id || request.id, draft.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (submitted) return null;

  return (
    <div>
      <div className="clarify-header flex items-center gap-2 mb-2.5 text-xs font-bold text-[var(--blue)] tracking-wide">
        <HelpCircle className="w-4 h-4" />
        <span>Clarification needed</span>
        {remaining !== null && (
          <span
            className={cn(
              'clarify-countdown ml-auto min-w-[42px] text-right text-[var(--muted)] font-mono font-bold tabular-nums',
              remaining <= 10 ? 'text-[var(--error)]' : '',
            )}
          >
            {remaining}s
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-1 inline-flex items-center justify-center w-6 h-6 border border-[var(--border2)] rounded-full bg-[var(--surface)] text-[var(--muted)] cursor-pointer hover:text-[var(--text)] hover:border-[var(--accent-bg-strong)]"
          aria-label={collapsed ? 'Expand clarification' : 'Collapse clarification'}
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <>
          <p className="clarify-question text-sm text-[var(--text)] mb-2">{request.question}</p>

          {request.choices && request.choices.length > 0 && (
            <div className="clarify-choices flex flex-wrap gap-2 mb-2">
              {request.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleChoiceClick(choice)}
                  className="clarify-choice flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] flex items-center justify-center text-[10px]">
                    {i + 1}
                  </span>
                  {choice}
                </button>
              ))}
            </div>
          )}

          <div className="clarify-response flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response…"
              className="clarify-input flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none border border-[var(--border)] rounded-lg px-3 py-1.5"
            />
            <button
              onClick={handleSubmit}
              disabled={!draft.trim()}
              className="clarify-submit flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </div>

          <p className="clarify-hint text-xs text-[var(--muted)] mt-1">Pick a choice, or type your own answer below.</p>
        </>
      )}
    </div>
  );
}
