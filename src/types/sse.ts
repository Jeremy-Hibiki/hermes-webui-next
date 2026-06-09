export interface SSEMessageEvent {
  event: 'message';
  data: { content: string };
}

export interface SSEReasoningEvent {
  event: 'reasoning';
  data: { content: string };
}

export interface SSEToolCallEvent {
  event: 'tool_call';
  data: { id: string; name: string; arguments: string; status: string };
}

export interface SSEToolResultEvent {
  event: 'tool_result';
  data: { id: string; result: string; status: string };
}

export interface SSEApprovalEvent {
  event: 'approval';
  data: {
    approval_id: string;
    session_id: string;
    description?: string;
    command?: string;
    pattern_keys?: string[];
    tool_name?: string;
    tool_args?: Record<string, unknown>;
  };
}

export interface SSEClarifyEvent {
  event: 'clarify';
  data: {
    clarify_id: string;
    session_id: string;
    question: string;
    choices_offered?: string[];
    description?: string;
    expires_at?: string;
    requested_at?: string;
    timeout_seconds?: number;
  };
}

export interface SSEDoneEvent {
  event: 'done';
  data: Record<string, unknown>;
}

export interface SSECancelledEvent {
  event: 'cancelled';
  data: Record<string, unknown>;
}

export interface SSEErrorEvent {
  event: 'error' | 'apperror';
  data: { message: string; code?: string };
}

export interface SSETodoStateEvent {
  event: 'todo_state';
  data: { todos: unknown[]; meta: Record<string, unknown> };
}

export interface SSEHeartbeatEvent {
  event: 'heartbeat';
  data: Record<string, unknown>;
}

export type SSEEvent =
  | SSEMessageEvent
  | SSEReasoningEvent
  | SSEToolCallEvent
  | SSEToolResultEvent
  | SSEApprovalEvent
  | SSEClarifyEvent
  | SSEDoneEvent
  | SSECancelledEvent
  | SSEErrorEvent
  | SSETodoStateEvent
  | SSEHeartbeatEvent;
