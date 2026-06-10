export interface CronJob {
  id: string;
  name: string;
  schedule: string | { expression?: string; kind?: string };
  schedule_display?: string;
  prompt: string;
  session_id: string;
  profile?: string;
  enabled: boolean;
  paused: boolean;
  state?: string;
  last_status?: string;
  last_error?: string;
  last_delivery_error?: string;
  next_run?: string;
  next_run_at?: string;
  last_run?: string;
  last_run_at?: string;
  deliver?: string;
  no_agent?: boolean;
  script?: string;
  model?: string;
  provider?: string;
  model_provider?: string;
  skills?: string[];
  toast_notifications?: boolean;
  repeat?: { times?: number | null };
  delivery_options?: CronDeliveryOptions;
  created_at: string;
}

export interface CronDeliveryOptions {
  telegram?: boolean;
  discord?: boolean;
  slack?: boolean;
  email?: string[];
}

export interface CronRun {
  id: string;
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  output?: string;
}

export interface CronRunFile {
  filename: string;
  modified: number;
  size: number;
  usage?: CronRunUsage;
}

export interface CronRunContent {
  content?: string;
  snippet?: string;
  usage?: CronRunUsage;
  error?: string;
}

export interface CronRunUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  model?: string;
}

export interface CronCreateParams {
  name?: string;
  schedule: string;
  prompt: string;
  session_id?: string;
  profile?: string;
  deliver?: string;
  delivery_options?: CronDeliveryOptions;
  toast_notifications?: boolean;
  skills?: string[];
  no_agent?: boolean;
  script?: string;
  model?: string;
  model_provider?: string;
}

export interface CronHistoryResponse {
  runs: CronRunFile[];
  total: number;
}

export type CronStatusState = 'needs_attention' | 'schedule_error' | 'paused' | 'off' | 'error' | 'active';

export interface CronStatusMeta {
  state: CronStatusState;
  label: string;
  color: string;
  bgColor: string;
}

export interface GatewayStatus {
  configured: boolean;
  running: boolean;
  health?: {
    reason?: string;
  };
}
