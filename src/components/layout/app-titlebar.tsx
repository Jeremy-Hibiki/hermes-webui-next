'use client';

import { useAtom } from 'jotai';
import { activeSessionAtom } from '@/atoms/session';
import { currentMobileViewAtom, sidebarCollapsedAtom } from '@/atoms/ui';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, RefreshCw } from 'lucide-react';

export function AppTitlebar() {
  const [activeSession] = useAtom(activeSessionAtom);
  const isMobile = useIsMobile();
  const [, setMobileView] = useAtom(currentMobileViewAtom);
  const [, setCollapsed] = useAtom(sidebarCollapsedAtom);

  const title = activeSession?.title || 'Hermes';

  return (
    <header
      className="app-titlebar flex items-center justify-center shrink-0 bg-[var(--sidebar)] border-b border-[var(--border)] text-[12px] text-[var(--muted)] select-none relative z-20"
      style={{
        height: '38px',
        padding: '0 12px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'max(12px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(12px, env(safe-area-inset-right, 0px))',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
      role="banner"
    >
      {/* Hamburger — mobile only */}
      <button
        className="app-titlebar-hamburger hidden items-center justify-center w-8 h-8 shrink-0 bg-none border-none text-[var(--muted)] rounded-lg cursor-pointer p-0 transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onClick={() => {
          if (isMobile) {
            setMobileView('sidebar');
          } else {
            setCollapsed((c) => !c);
          }
        }}
        aria-label="Menu"
        title="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Center: icon + title */}
      <div className="app-titlebar-inner flex items-center gap-2 min-w-0 max-w-full justify-center">
        <span className="app-titlebar-icon inline-flex items-center text-[var(--accent)]" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="16" height="16" aria-hidden="true">
            <defs>
              <linearGradient id="app-titlebar-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#F5C542' }} />
                <stop offset="100%" style={{ stopColor: '#D4961C' }} />
              </linearGradient>
            </defs>
            <rect x="30" y="10" width="4" height="46" rx="2" fill="url(#app-titlebar-gold)" />
            <path d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20" fill="#F5C542" opacity="0.9" />
            <path d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20" fill="#F5C542" opacity="0.9" />
            <circle cx="32" cy="10" r="4" fill="#F5C542" />
          </svg>
        </span>
        <span
          className="app-titlebar-title text-[12px] font-semibold text-[var(--text)] whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ letterSpacing: '-.01em', maxWidth: '60vw' }}
        >
          {title}
        </span>
      </div>

      {/* Spacer + reload */}
      <div className="app-titlebar-spacer hidden w-8 h-8 shrink-0" aria-hidden="true" />
      <button
        className="app-titlebar-reload inline-flex items-center justify-center w-8 h-8 shrink-0 bg-none border-none text-[var(--muted)] rounded-lg cursor-pointer p-0 transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onClick={() => window.location.reload()}
        aria-label="Reload"
        title="Reload page"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </header>
  );
}
