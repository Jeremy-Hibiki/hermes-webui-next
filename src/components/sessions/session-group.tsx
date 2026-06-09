'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface SessionGroupProps {
  name: string;
  color: string;
  children: React.ReactNode;
}

export function SessionGroup({ name, color, children }: SessionGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        <ChevronRight className={cn('w-3 h-3 transition-transform', !collapsed && 'rotate-90')} />
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="truncate">{name}</span>
      </button>
      {!collapsed && <div className="ml-1">{children}</div>}
    </div>
  );
}
