'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Brain, ChevronRight, Copy, Check } from 'lucide-react';

interface ThinkingCardProps {
  content: string;
  isStreaming?: boolean;
}

export function ThinkingCard({ content, isStreaming }: ThinkingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div
      className="border rounded-lg overflow-hidden my-1 hover:border-[var(--accent-hover,var(--accent))]"
      style={{
        background: 'var(--accent-bg)',
        border: '1px solid var(--accent-bg-strong, var(--accent-bg))',
        marginLeft: 'var(--msg-rail, 0px)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-[5px] hover:bg-[var(--hover-bg)] transition-colors opacity-[.85] hover:opacity-100"
      >
        <Brain className="w-3.5 h-3.5 text-[var(--accent)] opacity-70" />
        <span className="text-xs font-semibold text-[var(--accent)] tracking-[.02em]">
          {isStreaming ? (
            <span>
              Thinking
              <span className="thinking-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </span>
          ) : (
            'Thinking'
          )}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          className="ml-auto w-[22px] h-[22px] flex items-center justify-center rounded-[6px] hover:bg-[var(--accent-bg-strong,var(--accent-bg))] text-[var(--accent-text)] opacity-72 hover:opacity-100 transition-colors"
          aria-label="Copy thinking content"
        >
          {copied ? <Check className="w-[13px] h-[13px]" /> : <Copy className="w-[13px] h-[13px]" />}
        </button>
        <ChevronRight
          className={cn('w-2.5 h-2.5 text-[var(--accent-text)] opacity-40', expanded && 'rotate-90')}
          style={{ transition: 'transform .18s ease' }}
        />
      </button>
      {expanded && (
        <div
          className="px-3 pt-2 pb-2 text-[11px] text-[var(--muted)] whitespace-pre-wrap font-mono overflow-y-auto border-t"
          style={{ maxHeight: '260px', borderColor: 'var(--accent-bg-strong, var(--accent-bg))', lineHeight: '1.6' }}
        >
          {content}
        </div>
      )}
      <style jsx>{`
        .thinking-dots span {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.3;
          animation: thinking-pulse 1.4s ease-in-out infinite;
        }
        .thinking-dots span:nth-child(1) {
          animation-delay: 0s;
        }
        .thinking-dots span:nth-child(2) {
          animation-delay: 0.22s;
        }
        .thinking-dots span:nth-child(3) {
          animation-delay: 0.44s;
        }
        @keyframes thinking-pulse {
          0%,
          80%,
          100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          40% {
            opacity: 0.8;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
