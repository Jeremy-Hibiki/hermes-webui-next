export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ContentPart {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Message {
  id?: string;
  role: MessageRole;
  content: string | ContentPart[];
  timestamp?: string | number;
  _ts?: number;
  _error?: boolean;
  _partial?: boolean;
  _recovered?: boolean;
  _recovered_from_run_journal?: boolean;
  _pending_journal_recovery?: boolean;
  type?: string;
  interruption_cause?: string;
  reasoning?: string;
  reasoning_content?: string;
  thinking?: string;
  tool_calls?: ToolCall[];
  tool_result?: string;
  metadata?: Record<string, unknown>;
  attachments?: Attachment[];
  _turnUsage?: TurnUsage;
  _turnDuration?: number;
  _turnTps?: number;
  _gatewayRouting?: string;
  _effectiveModel?: string;
  _streamingHtml?: string;
  _isStreaming?: boolean;
}

export interface Attachment {
  name: string;
  path: string;
  mime: string;
  size?: number;
  is_image?: boolean;
}

export function extractTextContent(content: string | ContentPart[] | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p) => p && p.type === 'text')
      .map((p) => p.text || '')
      .join('')
      .trim();
  }
  return String(content);
}

export interface ToolCall {
  id?: string;
  tid?: string;
  name: string;
  arguments?: string;
  args?: Record<string, unknown>;
  result?: string;
  snippet?: string;
  preview?: string;
  done?: boolean;
  is_error?: boolean;
  status?: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  duration?: number;
  started_at?: number;
  assistant_msg_idx?: number;
  _recovered_from_run_journal?: boolean;
  _recovered_stream_id?: string;
}

export interface ApprovalRequest {
  id: string;
  approval_id?: string;
  session_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  stream_id: string;
  created_at: string;
  description?: string;
  command?: string;
  pattern_keys?: string[];
}

export interface ClarifyRequest {
  id: string;
  clarify_id?: string;
  session_id: string;
  question: string;
  choices?: string[];
  stream_id: string;
  created_at: string;
  expires_at?: string;
  timeout_seconds?: number;
}

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface TurnUsage {
  input_tokens: number;
  output_tokens: number;
  estimated_cost?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  cache_hit_percent?: number;
  context_length?: number;
  threshold_tokens?: number;
  last_prompt_tokens?: number;
}
