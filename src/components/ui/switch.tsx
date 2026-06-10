'use client';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
  className?: string;
  id?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-label'?: string;
}

export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  size = 'default',
  className,
  id,
  onClick,
  'aria-label': ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      aria-checked={checked ?? defaultChecked ?? false}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!disabled) onCheckedChange?.(!(checked ?? defaultChecked ?? false));
      }}
      className={cn(
        'peer relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent-bg)] focus-visible:ring-offset-1',
        'data-[size=default]:h-[18px] data-[size=default]:w-[32px]',
        'data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      style={{
        background: (checked ?? defaultChecked) ? 'var(--accent)' : 'var(--border)',
      }}
    >
      <span
        className="pointer-events-none block rounded-full bg-white shadow-sm transition-transform"
        style={{
          width: size === 'sm' ? 10 : 14,
          height: size === 'sm' ? 10 : 14,
          transform: (checked ?? defaultChecked) ? `translateX(${size === 'sm' ? 10 : 14}px)` : 'translateX(2px)',
        }}
      />
    </button>
  );
}
