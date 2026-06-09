"use client";

import { useState, useCallback } from "react";
import type { CronJob, CronCreateParams } from "@/types";
import { API_BASE } from "@/lib/constants";

interface UseCronReturn {
  jobs: CronJob[];
  loading: boolean;
  error: string | null;
  fetchJobs: () => Promise<void>;
  createJob: (params: CronCreateParams) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  toggleJob: (id: string, enabled: boolean) => Promise<void>;
  runJob: (id: string) => Promise<void>;
}

export function useCron(): UseCronReturn {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/crons`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : data.jobs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cron jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  const createJob = useCallback(async (params: CronCreateParams) => {
    setError(null);
    const res = await fetch(`${API_BASE}/crons/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    setError(null);
    const res = await fetch(`${API_BASE}/crons/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
  }, []);

  const toggleJob = useCallback(async (id: string, enabled: boolean) => {
    setError(null);
    const res = await fetch(`${API_BASE}/crons/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, enabled }),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
  }, []);

  const runJob = useCallback(async (id: string) => {
    setError(null);
    const res = await fetch(`${API_BASE}/crons/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
  }, []);

  return { jobs, loading, error, fetchJobs, createJob, deleteJob, toggleJob, runJob };
}
