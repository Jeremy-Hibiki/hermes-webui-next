export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ChatStartRequest {
  session_id: string;
  message: string;
  model?: string;
  provider?: string;
  attachments?: string[];
  system_prompt?: string;
}

export interface ChatStartResponse {
  stream_id: string;
  session_id: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
}

export interface AuthStatusResponse {
  enabled: boolean;
  logged_in: boolean;
  has_passkeys: boolean;
}

export interface LoginRequest {
  password: string;
}

export interface SessionsResponse {
  sessions: import('./session').Session[];
  projects: import('./session').Project[];
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

export interface UpdateCheckResponse {
  available: boolean;
  current_version: string;
  latest_version: string;
  release_notes: string;
}
