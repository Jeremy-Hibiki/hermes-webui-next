import type { Message } from './message';

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  messages: Message[];
  model: string | null;
  provider: string | null;
  workspace: string | null;
  profile: string;
  pinned: boolean;
  archived: boolean;
  project_id: string | null;
  message_count: number;
  source?: 'webui' | 'cli';
  parent_id?: string | null;
  streaming?: boolean;
  yolo?: boolean;
  worktree_path?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  collapsed?: boolean;
}

export interface SessionCreateParams {
  title?: string;
  workspace?: string;
  model?: string;
  provider?: string;
  profile?: string;
  project_id?: string | null;
}
