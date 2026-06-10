import type { Message } from './message';

export interface Session {
  session_id: string;
  title: string;
  workspace: string | null;
  model: string | null;
  model_provider: string | null;
  message_count: number;
  created_at: number;
  updated_at: number;
  last_message_at: number;
  pinned: boolean;
  archived: boolean;
  project_id: string | null;
  profile: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number | null;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  cache_hit_percent?: number;
  personality?: string | null;
  manual_title?: boolean;
  parent_session_id?: string;
  worktree_path?: string;
  worktree_branch?: string;
  worktree_repo_root?: string;
  worktree_created_at?: number;
  user_message_count?: number;
  active_stream_id?: string | null;
  pending_user_message?: string | null;
  has_pending_user_message?: boolean;
  is_cli_session?: boolean;
  source_tag?: string | null;
  raw_source?: string | null;
  session_source?: string | null;
  source_label?: string | null;
  read_only?: boolean;
  enabled_toolsets?: string[] | null;
  composer_draft?: Record<string, unknown>;
  is_streaming?: boolean;
  // Full session fields (when fetching /session?messages=1)
  messages?: Message[];
  tool_calls?: import('./message').ToolCall[];
  pending_attachments?: unknown[];
  pending_started_at?: number;
  context_length?: number;
  threshold_tokens?: number;
  last_prompt_tokens?: number;
  // Context engine fields
  context_engine?: string | null;
  compression_anchor_visible_idx?: number | null;
  compression_anchor_message_key?: string | null;
  compression_anchor_summary?: string | null;
  context_engine_state?: Record<string, unknown>;
  gateway_routing?: Record<string, unknown> | null;
  gateway_routing_history?: unknown[];
  // Attention info (from /sessions list)
  attention?: Record<string, unknown>;
}

export interface Project {
  project_id: string;
  name: string;
  color: string;
  profile?: string;
  created_at?: number;
  collapsed?: boolean;
}

export interface SessionCreateParams {
  workspace?: string;
  model?: string;
  model_provider?: string;
  profile?: string;
  project_id?: string | null;
  worktree?: boolean;
  prev_session_id?: string;
}
