export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  prompt: string;
  session_id: string;
  profile?: string;
  enabled: boolean;
  paused: boolean;
  last_run?: string;
  next_run?: string;
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

export interface CronCreateParams {
  name: string;
  schedule: string;
  prompt: string;
  session_id: string;
  profile?: string;
  delivery_options?: CronDeliveryOptions;
}
