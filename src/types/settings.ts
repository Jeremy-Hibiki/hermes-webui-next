export type ThemeMode = "system" | "dark" | "light";
export type FontSize = "small" | "default" | "large" | "xlarge";

export interface AppSettings {
  theme: ThemeMode;
  skin: string;
  font_size: FontSize;
  default_model: string | null;
  default_provider: string | null;
  default_workspace: string | null;
  send_key: "enter" | "cmd-enter";
  password_enabled: boolean;
  active_profile: string;
}

export interface Profile {
  name: string;
  display_name?: string;
  is_default: boolean;
  model?: string;
  provider?: string;
  workspace?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  reasoning?: boolean;
  vision?: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  configured: boolean;
  base_url?: string;
}
