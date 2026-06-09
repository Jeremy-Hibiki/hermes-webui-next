export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  tool_result?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: "pending" | "running" | "completed" | "error" | "cancelled";
  started_at?: string;
  completed_at?: string;
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
