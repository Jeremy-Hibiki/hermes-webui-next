'use client';

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

type ToastKind = 'info' | 'success' | 'error';

export function toast(message: string, kind: ToastKind = 'info') {
  if (kind === 'error') {
    sonnerToast.error(message);
  } else if (kind === 'success') {
    sonnerToast.success(message);
  } else {
    sonnerToast(message);
  }
}

export function useToast() {
  return { toast };
}

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        },
      }}
    />
  );
}
