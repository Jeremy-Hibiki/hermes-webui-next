'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAtom } from 'jotai';
import { composerContextAtom } from '@/atoms/chat';
import { activeSessionAtom } from '@/atoms/session';
import { useTranslation } from '@/lib/i18n';
import { apiPost } from '@/lib/api-client';
import { FolderOpen, Cpu, Brain, Activity } from 'lucide-react';

const MOBILE_CIRCUMFERENCE = 87.9645943;
const DEFAULT_CTX = 128 * 1024;

interface MobileComposerConfigButtonProps {
  onOpenWorkspace: () => void;
  onOpenModel: () => void;
  onOpenReasoning?: () => void;
}

function fmtTokens(n: number): string {
  if (!n || n < 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

export function MobileComposerConfigButton({
  onOpenWorkspace,
  onOpenModel,
  onOpenReasoning,
}: MobileComposerConfigButtonProps) {
  const [open, setOpen] = useState(false);
  const [usage] = useAtom(composerContextAtom);
  const [session] = useAtom(activeSessionAtom);
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [reasoningEffort, setReasoningEffort] = useState('');
  const [compressing, setCompressing] = useState(false);

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

  // Compute context percentage for the ring
  const { pct, hasPromptTok, totalTok, ctxWindow, threshold, cost, cacheHitPct, cacheReadTok, cacheWriteTok } =
    useMemo(() => {
      const promptTok = usage?.last_prompt_tokens ?? session?.last_prompt_tokens ?? 0;
      const inputTok = usage?.input_tokens ?? session?.input_tokens ?? 0;
      const outputTok = usage?.output_tokens ?? session?.output_tokens ?? 0;
      const ctxWindow = usage?.context_length || session?.context_length || DEFAULT_CTX;
      const totalTok = inputTok + outputTok;
      const hasPromptTok = !!promptTok;
      const rawPct = hasPromptTok ? Math.round((promptTok / ctxWindow) * 100) : 0;
      const pct = Math.min(100, rawPct);
      return {
        pct,
        hasPromptTok,
        totalTok,
        ctxWindow,
        threshold: usage?.threshold_tokens || session?.threshold_tokens || 0,
        cost: usage?.estimated_cost ?? session?.estimated_cost ?? undefined,
        cacheHitPct: usage?.cache_hit_percent ?? session?.cache_hit_percent ?? undefined,
        cacheReadTok: usage?.cache_read_tokens ?? session?.cache_read_tokens ?? 0,
        cacheWriteTok: usage?.cache_write_tokens ?? session?.cache_write_tokens ?? 0,
      };
    }, [usage, session]);

  const strokeDashoffset = MOBILE_CIRCUMFERENCE * (1 - pct / 100);
  const ringColor = pct > 75 ? 'var(--error)' : pct > 50 ? '#f59e0b' : '#22c55e';

  // Fetch reasoning effort when panel opens
  useEffect(() => {
    if (!open || !session?.model) return;
    const params = new URLSearchParams();
    params.set('model', session.model);
    if (session.model_provider) params.set('provider', session.model_provider);
    fetch(`/api/reasoning?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.reasoning_effort) setReasoningEffort(data.reasoning_effort);
        else setReasoningEffort('');
      })
      .catch(() => setReasoningEffort(''));
  }, [open, session?.model, session?.model_provider]);

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

  const compressText = pct >= 75 ? t('ctx_compress_action') : pct >= 50 ? t('ctx_compress_hint') : '';

  const usageText = hasPromptTok
    ? pct > 100
      ? `${pct}% used (context exceeded)`
      : `${pct}% used (${100 - pct}% left)`
    : `${fmtTokens(totalTok)} tokens used`;

  const tokensText = hasPromptTok
    ? `${fmtTokens(usage?.last_prompt_tokens || 0)} / ${fmtTokens(ctxWindow)} tokens used`
    : `In: ${fmtTokens(usage?.input_tokens || 0)} · Out: ${fmtTokens(usage?.output_tokens || 0)}`;

  const cacheText =
    cacheHitPct != null
      ? `Cache: ${cacheHitPct}% hit (${fmtTokens(cacheReadTok)} read / ${fmtTokens(cacheWriteTok)} write)`
      : '';

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        id="composerMobileConfigBtn"
        onClick={() => setOpen(!open)}
        className="composer-mobile-config-btn inline-flex xl:hidden items-center justify-center w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors"
        title={t('composer_mobile_config_title')}
        aria-label={t('composer_mobile_config_title')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="composerMobileConfigPanel"
      >
        <svg
          id="composerMobileCtxRing"
          viewBox="0 0 36 36"
          width="24"
          height="24"
          className="block overflow-visible"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3.5" opacity="0.2" />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={ringColor}
            strokeWidth="3.5"
            strokeDasharray={`${MOBILE_CIRCUMFERENCE} ${MOBILE_CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.45s ease' }}
          />
          <text
            x="18"
            y="18"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              transform: 'rotate(90deg)',
              transformOrigin: '18px 18px',
              fontSize: '9px',
              fontWeight: 700,
              fill: 'currentColor',
              stroke: 'none',
            }}
          >
            {hasPromptTok ? pct : '·'}
          </text>
        </svg>
      </button>

      {open && (
        <div
          id="composerMobileConfigPanel"
          className="composer-mobile-config-panel absolute bottom-[calc(100%+6px)] left-2 right-2 rounded-xl border border-[var(--border2)] bg-[var(--surface)] z-[180] p-2 flex flex-wrap gap-2"
          style={{ boxShadow: '0 -6px 28px rgba(0,0,0,.35)' }}
          aria-label={t('composer_mobile_config_title')}
        >
          <button
            id="composerMobileWorkspaceAction"
            onClick={() => {
              setOpen(false);
              onOpenWorkspace();
            }}
            className="composer-mobile-config-action flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] text-[var(--text)] hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer"
            title={t('workspace_switch_title')}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
            <span className="flex flex-col min-w-0">
              <span
                id="composerMobileWorkspaceLabel"
                className="text-[10px] text-[var(--muted)] uppercase tracking-wide"
              >
                {t('composer_mobile_workspace')}
              </span>
              <span className="truncate">{session?.workspace || t('workspace.title')}</span>
            </span>
          </button>

          <button
            id="composerMobileModelAction"
            onClick={() => {
              setOpen(false);
              onOpenModel();
            }}
            className="composer-mobile-config-action flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] text-[var(--text)] hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer"
            title={t('model_switch_title')}
          >
            <Cpu className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
            <span className="flex flex-col min-w-0">
              <span id="composerMobileModelLabel" className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                {t('composer_mobile_model')}
              </span>
              <span className="truncate">{session?.model || t('settings.systemDefault')}</span>
            </span>
          </button>

          {onOpenReasoning && (
            <button
              id="composerMobileReasoningAction"
              onClick={() => {
                setOpen(false);
                onOpenReasoning();
              }}
              className="composer-mobile-config-action flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] text-[var(--text)] hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer"
              title="Reasoning effort level"
            >
              <Brain className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
              <span className="flex flex-col min-w-0">
                <span
                  id="composerMobileReasoningLabel"
                  className="text-[10px] text-[var(--muted)] uppercase tracking-wide"
                >
                  Reasoning
                </span>
                <span className="truncate">{reasoningEffort || 'Default'}</span>
              </span>
            </button>
          )}

          {/* Context usage row */}
          {(hasPromptTok || totalTok > 0) && (
            <div
              id="composerMobileContextAction"
              className="composer-mobile-config-action flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] w-full"
              role="group"
              aria-label={t('composer_mobile_context')}
            >
              <Activity className="w-3.5 h-3.5 shrink-0 text-[var(--muted)] mt-0.5" />
              <span className="flex flex-col min-w-0 flex-1 gap-0.5">
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                  {t('composer_mobile_context')}
                </span>
                <span id="composerMobileContextUsage" className="text-[var(--text)] font-medium">
                  {usageText}
                </span>
                <span id="composerMobileContextTokens" className="text-[var(--muted)]">
                  {tokensText}
                </span>
                {!!threshold && !!ctxWindow && (
                  <span id="composerMobileContextThreshold" className="text-[var(--muted)]">
                    Auto-compress at {fmtTokens(threshold)} ({Math.round((threshold / ctxWindow) * 100)}%)
                  </span>
                )}
                {!!cost && (
                  <span id="composerMobileContextCost" className="text-[var(--muted)]">
                    Estimated cost: ${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}
                    {cacheText && ` · ${cacheText}`}
                  </span>
                )}
                {!cost && cacheText && <span className="text-[var(--muted)]">{cacheText}</span>}
                {compressText && (
                  <button
                    id="composerMobileCtxCompressBtn"
                    onClick={handleCompress}
                    disabled={compressing}
                    className="mt-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50 self-start"
                    style={{
                      borderColor: pct >= 75 ? 'var(--error)' : 'var(--border2)',
                      color: pct >= 75 ? 'var(--error)' : 'var(--text)',
                      background: 'transparent',
                    }}
                  >
                    {compressText}
                  </button>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
