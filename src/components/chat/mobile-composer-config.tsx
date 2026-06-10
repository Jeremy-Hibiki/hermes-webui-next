'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { composerContextAtom } from '@/atoms/chat';
import { activeSessionAtom } from '@/atoms/session';
import { useTranslation } from '@/lib/i18n';
import { FolderOpen, Cpu } from 'lucide-react';

const MOBILE_CIRCUMFERENCE = 87.9645943;
const DEFAULT_CTX = 128 * 1024;

interface MobileComposerConfigButtonProps {
  onOpenWorkspace: () => void;
  onOpenModel: () => void;
}

export function MobileComposerConfigButton({ onOpenWorkspace, onOpenModel }: MobileComposerConfigButtonProps) {
  const [open, setOpen] = useState(false);
  const [usage] = useAtom(composerContextAtom);
  const [session] = useAtom(activeSessionAtom);
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);

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
  const { pct, hasPromptTok, totalTok } = useMemo(() => {
    const promptTok = usage?.last_prompt_tokens ?? session?.last_prompt_tokens ?? 0;
    const inputTok = usage?.input_tokens ?? session?.input_tokens ?? 0;
    const outputTok = usage?.output_tokens ?? session?.output_tokens ?? 0;
    const ctxWindow = usage?.context_length || session?.context_length || DEFAULT_CTX;
    const totalTok = inputTok + outputTok;
    const hasPromptTok = !!promptTok;
    const rawPct = hasPromptTok ? Math.round((promptTok / ctxWindow) * 100) : 0;
    const pct = Math.min(100, rawPct);
    return { pct, hasPromptTok, totalTok };
  }, [usage, session]);

  const strokeDashoffset = MOBILE_CIRCUMFERENCE * (1 - pct / 100);
  const ringColor = pct > 75 ? 'var(--error)' : pct > 50 ? '#f59e0b' : '#22c55e';

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="composer-mobile-config-btn inline-flex xl:hidden items-center justify-center w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors"
        title={t('composer_mobile_config_title')}
        aria-label={t('composer_mobile_config_title')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="composerMobileConfigPanel"
      >
        <svg
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
          className="absolute bottom-[calc(100%+4px)] right-0 min-w-[220px] max-w-[280px] rounded-[10px] border border-[var(--border2)] bg-[var(--surface)] z-[200] p-1.5 flex flex-col gap-0.5"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,.4)' }}
          aria-label={t('composer_mobile_config_title')}
        >
          <button
            onClick={() => {
              setOpen(false);
              onOpenWorkspace();
            }}
            className="composer-mobile-config-action flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] text-[var(--text)] hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer"
            title={t('workspace_switch_title')}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
            <span className="flex flex-col min-w-0">
              <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                {t('composer_mobile_workspace')}
              </span>
              <span className="truncate">{session?.workspace || t('workspace.title')}</span>
            </span>
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onOpenModel();
            }}
            className="composer-mobile-config-action flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] text-[var(--text)] hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer"
            title={t('model_switch_title')}
          >
            <Cpu className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
            <span className="flex flex-col min-w-0">
              <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                {t('composer_mobile_model')}
              </span>
              <span className="truncate">{session?.model || t('settings.systemDefault')}</span>
            </span>
          </button>

          {/* Context usage row */}
          {(hasPromptTok || totalTok > 0) && (
            <div
              className="composer-mobile-config-action flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px]"
              role="group"
              aria-label={t('composer_mobile_context')}
            >
              <span className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                  {t('composer_mobile_context')}
                </span>
                <span className="text-[var(--text)]">{hasPromptTok ? `${pct}% used` : `${totalTok} tokens`}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
