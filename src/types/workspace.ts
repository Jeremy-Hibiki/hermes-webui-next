export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size?: number;
  mtime_ns?: number;
  modified?: string;
  git_status?: string;
  children?: FileEntry[];
}

export interface FileContent {
  path: string;
  content: string;
  language?: string;
  encoding?: string;
  size?: number;
  lines?: number;
}

export interface WorkspaceInfo {
  name: string;
  path: string;
  is_git: boolean;
  branch?: string;
  last?: string;
  terminal_remote_backend?: boolean;
}

export interface GitStatus {
  branch: string;
  dirty: number;
  modified: number;
  untracked: number;
  ahead: number;
  behind: number;
  is_git?: boolean;
}

export interface GitDiff {
  diff: string;
}
