export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ChatStartRequest {
  session_id: string;
  message: string;
  model?: string;
  model_provider?: string;
  profile?: string;
  workspace?: string;
  attachments?: string[];
  explicit_model_pick?: boolean;
}

export interface ChatStartResponse {
  stream_id: string;
  session_id: string;
  pending_started_at?: number;
  turn_id?: string;
  title?: string;
  effective_model?: string;
  effective_model_provider?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  sessions: number;
  active_streams: number;
  active_runs: number;
  runs: unknown[];
  last_run_finished_at: number | null;
  server_started_at: number;
  uptime_seconds: number;
  accept_loop?: Record<string, unknown>;
  checks?: Record<string, unknown>;
}

export interface AuthStatusResponse {
  auth_enabled: boolean;
  logged_in: boolean;
  password_auth_enabled: boolean;
  passwordless_enabled: boolean;
  passkeys_enabled: boolean;
  passkeys_count: number;
  passkey_feature_flag: boolean;
}

export interface LoginRequest {
  password: string;
}

export interface SessionsResponse {
  sessions: import('./session').Session[];
  projects: import('./session').Project[];
  cli_count: number;
  all_profiles: boolean;
  active_profile: string;
  other_profile_count: number;
  server_time: number;
  server_tz: string;
}

export interface OnboardingStatus {
  completed: boolean;
  settings: {
    provider?: string;
    model?: string;
    api_key_set?: boolean;
    base_url?: string;
  };
  system: {
    agent_ok?: boolean;
    provider_ok?: boolean;
    password_ok?: boolean;
  };
  setup: OnboardingProvider[];
  workspaces: string[];
  models: OnboardingModel[];
}

export interface OnboardingProvider {
  id: string;
  name: string;
  category: 'easy' | 'self-hosted' | 'specialized';
  default_model?: string;
  default_base_url?: string;
  oauth?: boolean;
  oauth_provider?: string;
}

export interface OnboardingModel {
  id: string;
  name: string;
  provider?: string;
}

export interface OnboardingSetupBody {
  provider: string;
  model?: string;
  api_key?: string;
  base_url?: string;
  password?: string;
}

export interface OnboardingProbeResponse {
  ok: boolean;
  models?: OnboardingModel[];
  error?: string;
}

export interface OnboardingOAuthStartResponse {
  flow_id: string;
  user_code?: string;
  verification_uri?: string;
}

export interface OnboardingOAuthPollResponse {
  status: 'pending' | 'complete' | 'error' | 'expired';
  api_key?: string;
  error?: string;
}

export interface UpdateCheckComponent {
  name: string;
  behind: number;
  current_sha: string;
  latest_sha: string;
  branch: string;
  repo_url: string;
  compare_url: string;
}

export interface UpdateCheckResponse {
  webui?: UpdateCheckComponent;
  agent?: UpdateCheckComponent;
  checked_at?: number;
  disabled?: boolean;
}
