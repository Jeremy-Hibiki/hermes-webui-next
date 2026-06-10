'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import { activeSessionAtom } from '@/atoms/session';
import { ChevronDown, Brain } from 'lucide-react';
import { apiPost, fetcher } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const ALL_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

interface ReasoningState {
  reasoning_effort?: string;
  supported_efforts?: string[];
}

function formatLabel(effort: string): string {
  const e = effort.trim().toLowerCase();
  if (e === 'none') return 'None';
  if (!e) return 'Default';
  return e;
}

export function ReasoningChip() {
  const [session] = useAtom(activeSessionAtom);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ReasoningState>({});
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);

  const model = session?.model || '';
  const provider = session?.model_provider || '';

  // Fetch reasoning state when model changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (model) params.set('model', model);
    if (provider) params.set('provider', provider);
    const qs = params.toString();
    fetcher<ReasoningState>(`/api/reasoning${qs ? '?' + qs : ''}`)
      .then((st) => setState(st || {}))
      .catch(() => setState({ supported_efforts: [] }));
  }, [model, provider]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const supported = state.supported_efforts || [];
  const supports = supported.length > 0;
  const effort = state.reasoning_effort || '';
  const isInactive = !effort || effort === 'none';

  const handleSelect = useCallback(async (eff: string) => {
    setOpen(false);
    setLoading(true);
    try {
      const st = await apiPost<ReasoningState>('/api/reasoning', { effort: eff });
      setState((prev) => ({
        ...prev,
        reasoning_effort: st?.reasoning_effort || eff,
        supported_efforts: st?.supported_efforts || prev.supported_efforts,
      }));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  if (!supports) return null;

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        ref={chipRef}
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-2 max-w-[180px] px-3 py-2 rounded-full border border-transparent bg-transparent font-medium cursor-pointer transition-colors text-xs',
          'hover:text-[var(--text)] hover:bg-[var(--hover-bg)]',
          open && 'text-[var(--text)] bg-[var(--accent-bg)] border-[var(--accent-bg)]',
          isInactive && 'opacity-[0.78]',
        )}
        style={{ color: open ? undefined : 'var(--muted)' }}
      >
        <Brain className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{formatLabel(effort)}</span>
        <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute bottom-[calc(100%+4px)] left-0 min-w-[140px] rounded-[10px] border border-[var(--border2)] bg-[var(--surface)] z-[200] p-1 overflow-hidden"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,.4)' }}
        >
          {ALL_EFFORTS.map((eff) => (
            <button
              key={eff}
              onClick={() => handleSelect(eff)}
              className={cn(
                'w-full text-left px-3.5 py-2 rounded-md text-[13px] text-[var(--text)] whitespace-nowrap transition-colors cursor-pointer',
                'hover:bg-[rgba(255,255,255,0.07)]',
                effort === eff && 'bg-[var(--accent-bg)]',
              )}
            >
              {formatLabel(eff)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
