'use client';

import { useEffect, useRef, useCallback } from 'react';
import { SSEClient } from '@/lib/sse-client';

interface UseSSEOptions {
  enabled?: boolean;
}

export function useSSE(
  url: string | null,
  handlers: Record<string, (data: unknown) => void>,
  options: UseSSEOptions = {},
) {
  const { enabled = true } = options;
  const clientRef = useRef<SSEClient | null>(null);
  const handlersRef = useRef(handlers);

  handlersRef.current = handlers;

  useEffect(() => {
    if (!url || !enabled) {
      clientRef.current?.close();
      clientRef.current = null;
      return;
    }

    const client = new SSEClient();
    clientRef.current = client;

    const wrappedHandlers: Record<string, (data: unknown) => void> = {};
    for (const key of Object.keys(handlers)) {
      wrappedHandlers[key] = (data: unknown) => {
        handlersRef.current[key]?.(data);
      };
    }

    client.connect(url, wrappedHandlers);

    return () => {
      client.close();
    };
  }, [url, enabled]);

  const close = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
  }, []);

  return { close };
}
