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
  status: "ok" | "degraded";
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
  sessions: import("./session").Session[];
  projects: import("./session").Project[];
}

export interface OnboardingStatus {
  complete: boolean;
  has_provider: boolean;
  has_model: boolean;
}

export interface UpdateCheckResponse {
  available: boolean;
  current_version: string;
  latest_version: string;
  release_notes: string;
}
