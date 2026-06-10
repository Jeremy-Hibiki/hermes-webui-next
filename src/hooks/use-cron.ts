'use client';

import { useState, useCallback } from 'react';
import { fetcher, apiPost } from '@/lib/api-client';
import type { CronJob, CronCreateParams, CronRunContent, CronHistoryResponse, GatewayStatus } from '@/types';

interface CronRunningStatus {
  running: boolean;
  elapsed?: number;
  job_id?: string;
}

interface CronRecentCompletion {
  job_id: string;
  name: string;
  status: string;
  completed_at: number;
  toast_notifications?: boolean;
}

interface CronRecentResponse {
  completions: CronRecentCompletion[];
}

interface UseCronReturn {
  jobs: CronJob[];
  loading: boolean;
  error: string | null;
  fetchJobs: () => Promise<void>;
  createJob: (params: CronCreateParams) => Promise<{ id?: string }>;
  updateJob: (params: Record<string, unknown>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  toggleJob: (id: string, enabled: boolean) => Promise<void>;
  pauseJob: (id: string) => Promise<void>;
  resumeJob: (id: string) => Promise<void>;
  runJob: (id: string) => Promise<void>;
  fetchHistory: (jobId: string) => Promise<CronHistoryResponse>;
  fetchRunContent: (jobId: string, filename: string) => Promise<CronRunContent>;
  fetchGatewayStatus: () => Promise<GatewayStatus>;
  fetchRunningStatus: (jobId: string) => Promise<CronRunningStatus>;
  fetchRecentCompletions: (since: number) => Promise<CronRecentResponse>;
}

export function useCron(): UseCronReturn {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetcher<{ jobs: CronJob[] }>('/crons');
      setJobs(Array.isArray(data) ? data : (data.jobs ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cron jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  const createJob = useCallback(async (params: CronCreateParams): Promise<{ id?: string }> => {
    setError(null);
    const res = await apiPost<{ id?: string; job?: { id?: string } }>(
      '/crons/create',
      params as unknown as Record<string, unknown>,
    );
    return { id: res?.id ?? res?.job?.id };
  }, []);

  const updateJob = useCallback(async (params: Record<string, unknown>) => {
    setError(null);
    await apiPost('/crons/update', params);
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    setError(null);
    await apiPost('/crons/delete', { job_id: id });
  }, []);

  const toggleJob = useCallback(async (id: string, enabled: boolean) => {
    setError(null);
    await apiPost('/crons/update', { job_id: id, enabled });
  }, []);

  const pauseJob = useCallback(async (id: string) => {
    setError(null);
    await apiPost('/crons/pause', { job_id: id });
  }, []);

  const resumeJob = useCallback(async (id: string) => {
    setError(null);
    await apiPost('/crons/resume', { job_id: id });
  }, []);

  const runJob = useCallback(async (id: string) => {
    setError(null);
    await apiPost('/crons/run', { job_id: id });
  }, []);

  const fetchHistory = useCallback(async (jobId: string): Promise<CronHistoryResponse> => {
    return fetcher<CronHistoryResponse>(`/crons/history?job_id=${encodeURIComponent(jobId)}&limit=50`);
  }, []);

  const fetchRunContent = useCallback(async (jobId: string, filename: string): Promise<CronRunContent> => {
    return fetcher<CronRunContent>(
      `/crons/run?job_id=${encodeURIComponent(jobId)}&filename=${encodeURIComponent(filename)}`,
    );
  }, []);

  const fetchGatewayStatus = useCallback(async (): Promise<GatewayStatus> => {
    return fetcher<GatewayStatus>('/gateway/status');
  }, []);

  const fetchRunningStatus = useCallback(async (jobId: string): Promise<CronRunningStatus> => {
    return fetcher<CronRunningStatus>(`/crons/status?job_id=${encodeURIComponent(jobId)}`);
  }, []);

  const fetchRecentCompletions = useCallback(async (since: number): Promise<CronRecentResponse> => {
    return fetcher<CronRecentResponse>(`/crons/recent?since=${since}`);
  }, []);

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    toggleJob,
    pauseJob,
    resumeJob,
    runJob,
    fetchHistory,
    fetchRunContent,
    fetchGatewayStatus,
    fetchRunningStatus,
    fetchRecentCompletions,
  };
}
