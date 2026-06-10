'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';

export default function Page() {
  return (
    <Suspense>
      <AppShell panel="todos" />
    </Suspense>
  );
}
