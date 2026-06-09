export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  modified?: string;
  git_status?: string;
  children?: FileEntry[];
}

export interface FileContent {
  path: string;
  content: string;
  language?: string;
  encoding?: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  path: string;
  is_git: boolean;
  branch?: string;
}

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface GitDiff {
  path: string;
  staged: string;
  unstaged: string;
}
