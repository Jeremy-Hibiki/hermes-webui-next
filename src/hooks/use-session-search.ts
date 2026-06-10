'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import type { Session } from '@/types';

interface SearchHit {
  session_id: string;
  match_type: 'title' | 'content';
  match_preview?: string;
}

interface SearchResponse {
  sessions: SearchHit[];
}

export function useSessionSearch(allSessions: Session[]) {
  const [query, setQueryImmediate] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: searchData, isLoading: isSearching } = useSWR<SearchResponse>(
    debouncedQuery ? `/sessions/search?q=${encodeURIComponent(debouncedQuery)}&content=1&depth=5` : null,
    fetcher,
    { dedupingInterval: 300, revalidateOnFocus: false },
  );

  const setQuery = useCallback((value: string) => {
    setQueryImmediate(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setDebouncedQuery('');
      return;
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 350);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryImmediate('');
    setDebouncedQuery('');
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return allSessions;

    const ql = q.toLowerCase();
    const titleMatches = allSessions.filter((s) => s.title && s.title.toLowerCase().includes(ql));
    const titleMatchIds = new Set(titleMatches.map((s) => s.session_id));

    if (!searchData?.sessions?.length) return titleMatches;

    const sessionMap = new Map(allSessions.map((s) => [s.session_id, s]));
    const contentOnly: Session[] = [];
    for (const hit of searchData.sessions) {
      if (hit.match_type !== 'content' || titleMatchIds.has(hit.session_id)) continue;
      const session = sessionMap.get(hit.session_id);
      if (session) contentOnly.push(session);
    }

    return [...titleMatches, ...contentOnly];
  }, [query, allSessions, searchData]);

  return {
    query,
    setQuery,
    results,
    isSearching: isSearching && !!debouncedQuery,
    clearSearch,
  };
}
