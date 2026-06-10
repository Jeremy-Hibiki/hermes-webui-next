export interface KanbanTask {
  id: string;
  title: string;
  body?: string;
  status: string;
  assignee?: string;
  tenant?: string;
  priority?: string;
  age?: string;
  progress?: number;
  created_at?: string;
  updated_at?: string;
  comment_count?: number;
  link_counts?: { children?: number; parents?: number };
}

export interface KanbanColumn {
  id: string;
  label: string;
}

export interface KanbanBoard {
  slug: string;
  name: string;
  color?: string;
  icon?: string;
  is_current?: boolean;
  read_only?: boolean;
  total?: number;
  counts?: Record<string, number>;
}

export interface KanbanStats {
  by_status: Record<string, number>;
  by_assignee: Record<string, number>;
}

export interface KanbanComment {
  id: string;
  author?: string;
  body: string;
  created_at?: string;
}

export interface KanbanConfig {
  lane_by_profile?: boolean;
  read_only?: boolean;
  default_tenant?: string;
  include_archived_by_default?: boolean;
}

export interface KanbanSSEEvent {
  task_id?: string;
  type?: string;
  [key: string]: unknown;
}

export interface KanbanSSEBatch {
  events: KanbanSSEEvent[];
  cursor?: number;
  latest_event_id?: number;
}
