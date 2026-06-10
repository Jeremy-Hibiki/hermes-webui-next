export interface SSETokenEvent {
  event: 'token';
  data: { text: string };
}

export interface SSEReasoningEvent {
  event: 'reasoning';
  data: { text: string };
}

export interface SSEToolEvent {
  event: 'tool';
  data: { tid?: string; name?: string; preview?: string; args?: Record<string, unknown>; event_type?: string };
}

export interface SSEToolCompleteEvent {
  event: 'tool_complete';
  data: { tid?: string; name?: string; preview?: string; is_error?: boolean };
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

export interface SSEStreamEndEvent {
  event: 'stream_end';
  data: Record<string, unknown>;
}

export interface SSEDoneEvent {
  event: 'done';
  data: Record<string, unknown>;
}

export interface SSECancelEvent {
  event: 'cancel';
  data: Record<string, unknown>;
}

export interface SSEErrorEvent {
  event: 'error';
  data: { message?: string; error?: string };
}

export interface SSEAppErrorEvent {
  event: 'apperror';
  data: { message?: string; error?: string; label?: string };
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
  | SSETokenEvent
  | SSEReasoningEvent
  | SSEToolEvent
  | SSEToolCompleteEvent
  | SSEApprovalEvent
  | SSEClarifyEvent
  | SSEStreamEndEvent
  | SSEDoneEvent
  | SSECancelEvent
  | SSEErrorEvent
  | SSEAppErrorEvent
  | SSETodoStateEvent
  | SSEHeartbeatEvent;
