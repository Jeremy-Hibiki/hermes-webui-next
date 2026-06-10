'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAtom } from 'jotai';
import { composerContextAtom } from '@/atoms/chat';
import { activeSessionAtom } from '@/atoms/session';
import { useTranslation } from '@/lib/i18n';
import { apiPost } from '@/lib/api-client';

function fmtTokens(n: number): string {
  if (!n || n < 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

const CIRCUMFERENCE = 61.261056745;
const DEFAULT_CTX = 128 * 1024;

export function ContextIndicator() {
  const [usage] = useAtom(composerContextAtom);
  const [session] = useAtom(activeSessionAtom);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const { t } = useTranslation();

  // Merge atom usage with session fallback
  const u = useMemo(() => {
    if (!usage && !session) return null;
    return {
      last_prompt_tokens: usage?.last_prompt_tokens ?? session?.last_prompt_tokens ?? 0,
      input_tokens: usage?.input_tokens ?? session?.input_tokens ?? 0,
      output_tokens: usage?.output_tokens ?? session?.output_tokens ?? 0,
      estimated_cost: usage?.estimated_cost ?? session?.estimated_cost ?? undefined,
      cache_read_tokens: usage?.cache_read_tokens ?? session?.cache_read_tokens ?? undefined,
      cache_write_tokens: usage?.cache_write_tokens ?? session?.cache_write_tokens ?? undefined,
      cache_hit_percent: usage?.cache_hit_percent ?? session?.cache_hit_percent ?? undefined,
      context_length: usage?.context_length || session?.context_length || undefined,
      threshold_tokens: usage?.threshold_tokens || session?.threshold_tokens || undefined,
    };
  }, [usage, session]);

  const {
    promptTok,
    totalTok,
    ctxWindow,
    pct,
    rawPct,
    hasPromptTok,
    cacheReadTok,
    cacheWriteTok,
    cacheHitPct,
    cost,
    threshold,
    colorClass,
  } = useMemo(() => {
    if (!u) {
      return {
        promptTok: 0,
        totalTok: 0,
        ctxWindow: DEFAULT_CTX,
        pct: 0,
        rawPct: 0,
        hasPromptTok: false,
        cacheReadTok: 0,
        cacheWriteTok: 0,
        cacheHitPct: undefined,
        cost: undefined,
        threshold: 0,
        colorClass: '',
      };
    }
    const promptTok = u.last_prompt_tokens || 0;
    const totalTok = (u.input_tokens || 0) + (u.output_tokens || 0);
    const cacheReadTok = u.cache_read_tokens || 0;
    const cacheWriteTok = u.cache_write_tokens || 0;
    const ctxWindow = u.context_length || DEFAULT_CTX;
    const cost = u.estimated_cost;
    const hasPromptTok = !!promptTok;
    const rawPct = hasPromptTok ? Math.round((promptTok / ctxWindow) * 100) : 0;
    const pct = Math.min(100, rawPct);
    const cacheHitPct = u.cache_hit_percent;
    const threshold = u.threshold_tokens || 0;
    let colorClass = '';
    if (pct > 75) colorClass = 'ctx-high';
    else if (pct > 50) colorClass = 'ctx-mid';
    return {
      promptTok,
      totalTok,
      ctxWindow,
      pct,
      rawPct,
      hasPromptTok,
      cacheReadTok,
      cacheWriteTok,
      cacheHitPct,
      cost,
      threshold,
      colorClass,
    };
  }, [u]);

  const handleCompress = useCallback(async () => {
    if (!session?.session_id || compressing) return;
    setCompressing(true);
    try {
      await apiPost('/session/compress', { session_id: session.session_id });
    } catch (err) {
      console.error('Failed to compress context:', err);
    } finally {
      setCompressing(false);
    }
  }, [session?.session_id, compressing]);

  // Show indicator whenever we have any usage data
  const visible = !!(promptTok || totalTok || cost || cacheReadTok || cacheWriteTok);
  if (!visible) return null;

  const strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);

  const cacheText =
    cacheHitPct != null
      ? `Cache: ${cacheHitPct}% hit (${fmtTokens(cacheReadTok)} read / ${fmtTokens(cacheWriteTok)} write)`
      : '';

  const compressText = pct >= 75 ? t('ctx_compress_action') : pct >= 50 ? t('ctx_compress_hint') : '';

  const usageText = hasPromptTok
    ? rawPct > 100
      ? `${rawPct}% used (context exceeded)`
      : `${pct}% used (${100 - pct}% left)`
    : `${fmtTokens(totalTok)} tokens used`;

  const tokensText = hasPromptTok
    ? `${fmtTokens(promptTok)} / ${fmtTokens(ctxWindow)} tokens used`
    : `In: ${fmtTokens(u?.input_tokens || 0)} · Out: ${fmtTokens(u?.output_tokens || 0)}`;

  return (
    <div
      id="ctxIndicatorWrap"
      className="ctx-indicator-wrap relative inline-flex items-center justify-center flex-shrink-0"
      onMouseEnter={() => setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
      onFocus={() => setTooltipOpen(true)}
      onBlur={() => setTooltipOpen(false)}
    >
      <button
        id="ctxIndicator"
        className={`ctx-indicator relative inline-flex items-center justify-center w-[34px] h-[34px] p-0 border-none bg-none text-[var(--muted)] cursor-pointer flex-shrink-0 transition-opacity duration-150 hover:opacity-[0.88] hover:-translate-y-px ${colorClass}`}
        aria-label={`Context window ${hasPromptTok ? pct + '%' : fmtTokens(totalTok) + ' tokens'} used`}
        aria-describedby="ctxTooltip"
      >
        <span className="ctx-ring relative flex w-6 h-6 items-center justify-center">
          <svg
            className="ctx-ring-svg absolute inset-0 w-6 h-6"
            viewBox="0 0 24 24"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              className="ctx-ring-track"
              cx="12"
              cy="12"
              r="9.75"
              fill="none"
              strokeWidth="3"
              style={{ stroke: 'rgba(255,255,255,0.12)' }}
            />
            <circle
              className="ctx-ring-value"
              cx="12"
              cy="12"
              r="9.75"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                strokeDasharray: CIRCUMFERENCE,
                strokeDashoffset: strokeDashoffset,
                stroke: 'var(--muted)',
                transition: 'stroke-dashoffset 0.45s ease, stroke 0.25s ease',
              }}
            />
          </svg>
          <span
            className="ctx-ring-center relative flex w-[15px] h-[15px] items-center justify-center rounded-full text-[8px] font-semibold leading-none text-[var(--muted)]"
            style={{ background: 'var(--bg)', fontVariantNumeric: 'tabular-nums' }}
          >
            {hasPromptTok ? pct : '·'}
          </span>
        </span>
      </button>

      {/* Tooltip */}
      {tooltipOpen && (
        <div
          id="ctxTooltip"
          role="tooltip"
          className="ctx-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl border border-[var(--border2)] bg-[var(--surface)] shadow-lg z-[300] px-3.5 py-3 text-xs"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,.4)' }}
        >
          <div className="flex flex-col gap-1">
            <div className="text-[var(--text)] font-semibold">{usageText}</div>
            <div className="text-[var(--muted)]">{tokensText}</div>
            {!!threshold && !!ctxWindow && (
              <div className="text-[var(--muted)]">
                Auto-compress at {fmtTokens(threshold)} ({Math.round((threshold / ctxWindow) * 100)}%)
              </div>
            )}
            {!!cost && (
              <div className="text-[var(--muted)]">
                Estimated cost: ${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}
                {cacheText && ` · ${cacheText}`}
              </div>
            )}
            {!cost && cacheText && <div className="text-[var(--muted)]">{cacheText}</div>}
            {compressText && (
              <button
                onClick={handleCompress}
                disabled={compressing}
                className="ctx-compress-btn mt-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50"
                style={{
                  borderColor: pct >= 75 ? 'var(--error)' : 'var(--border2)',
                  color: pct >= 75 ? 'var(--error)' : 'var(--text)',
                  background: 'transparent',
                }}
              >
                {compressText}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
