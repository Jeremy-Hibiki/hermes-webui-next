'use client';

import { useEffect, useRef } from 'react';

const SWIPE_EDGE = 28;
const SWIPE_TRIGGER = 72;
const MAX_VERTICAL = 48;

function isPwaStandalone(): boolean {
  try {
    return (
      document.documentElement.classList.contains('pwa-standalone') ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  } catch {
    return false;
  }
}

function isDesktopWidth(): boolean {
  try {
    return window.matchMedia('(min-width: 641px)').matches;
  } catch {
    return true;
  }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true;
  if (target.closest('a, button, [role="button"]')) return true;
  return false;
}

interface SwipeState {
  startX: number;
  startY: number;
  active: boolean;
  opened: boolean;
}

export function useMobileSwipe(onOpenSidebar: () => void) {
  const swipeRef = useRef<SwipeState | null>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!isPwaStandalone() || isDesktopWidth()) return;
      if (e.pointerType === 'mouse' || (e.pointerType && e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
      const clientX = e.clientX || 0;
      if (clientX > SWIPE_EDGE) return;
      if (isInteractiveTarget(e.target as EventTarget)) return;
      swipeRef.current = { startX: clientX, startY: e.clientY || 0, active: true, opened: false };
    };

    const onPointerMove = (e: PointerEvent) => {
      const swipe = swipeRef.current;
      if (!swipe || !swipe.active || swipe.opened) return;
      const dx = (e.clientX || 0) - swipe.startX;
      const dy = (e.clientY || 0) - swipe.startY;
      if (dx < 0 || Math.abs(dy) > MAX_VERTICAL * 1.5) {
        swipeRef.current = null;
        return;
      }
      if (dx >= SWIPE_TRIGGER && Math.abs(dy) <= MAX_VERTICAL && dx > Math.abs(dy) * 1.5) {
        if (e.cancelable) e.preventDefault();
        swipe.opened = true;
        onOpenSidebar();
      }
    };

    const onPointerUp = () => {
      swipeRef.current = null;
    };

    const onPointerCancel = () => {
      swipeRef.current = null;
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [onOpenSidebar]);
}
