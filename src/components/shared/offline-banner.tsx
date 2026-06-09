"use client";

import { WifiOff, X, RefreshCw } from "lucide-react";

interface OfflineBannerProps {
  offline: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

export function OfflineBanner({ offline, onRetry, onDismiss }: OfflineBannerProps) {
  if (!offline) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--warning)] text-white text-sm">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>You are offline</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-white/20 hover:bg-white/30"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="p-1 rounded hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
