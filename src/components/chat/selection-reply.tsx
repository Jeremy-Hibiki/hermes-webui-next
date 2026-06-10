'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Reply } from 'lucide-react';

interface SelectionReplyProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onQuote: (text: string) => void;
}

export function SelectionReply({ containerRef, onQuote }: SelectionReplyProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setPos(null), 150);
      return;
    }

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 3) return;

    const rect = range.getBoundingClientRect();
    setSelectedText(text);
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!pos) return null;

  return (
    <button
      className="fixed z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg transition-opacity hover:scale-105 active:scale-95"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -100%)',
        background: 'var(--surface)',
        color: 'var(--accent-text)',
        border: '1px solid var(--border)',
      }}
      onClick={() => {
        onQuote(selectedText);
        window.getSelection()?.removeAllRanges();
        setPos(null);
      }}
    >
      <Reply className="w-3 h-3" />
      Reply
    </button>
  );
}
