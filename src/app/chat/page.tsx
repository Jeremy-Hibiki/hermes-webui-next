'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';

export default function ChatPage() {
  return (
    <Suspense>
      <AppShell panel="chat" />
    </Suspense>
  );
}
