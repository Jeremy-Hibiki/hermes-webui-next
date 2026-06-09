import type { ThemeMode } from "@/types";

export interface SkinConfig {
  id: string;
  name: string;
  description: string;
}

export const THEMES: ThemeMode[] = ["system", "dark", "light"];

export const SKINS: SkinConfig[] = [
  { id: "default", name: "Default", description: "Warm gold accent" },
  { id: "ares", name: "Ares", description: "Red accent" },
  { id: "mono", name: "Mono", description: "Gray accent" },
  { id: "graphite", name: "Graphite", description: "Neutral workbench" },
  { id: "slate", name: "Slate", description: "Slate blue-gray" },
  { id: "poseidon", name: "Poseidon", description: "Ocean blue" },
  { id: "sisyphus", name: "Sisyphus", description: "Deep purple" },
  { id: "charizard", name: "Charizard", description: "Fiery orange" },
  { id: "sienna", name: "Sienna", description: "Warm earth tones" },
  { id: "catppuccin", name: "Catppuccin", description: "Pastel comfort" },
  { id: "hepburn", name: "Hepburn", description: "Elegant pink" },
  { id: "nous", name: "Nous", description: "Nous blue" },
  { id: "neon", name: "Neon", description: "Vibrant neon" },
  { id: "geist-contrast", name: "Geist Contrast", description: "High contrast" },
  { id: "zeus", name: "Zeus", description: "Dark gold" },
  { id: "verdigris", name: "Verdigris", description: "Patina green" },
];

export function getSkinConfig(id: string): SkinConfig | undefined {
  return SKINS.find((s) => s.id === id);
}

export function resolveTheme(theme: ThemeMode): "dark" | "light" {
  if (theme !== "system") return theme;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
}

export function applyThemeToDocument(
  theme: ThemeMode,
  skin: string,
  fontSize: string
): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  const html = document.documentElement;
  html.classList.toggle("dark", resolved === "dark");
  html.dataset.skin = skin;
  html.dataset.fontSize = fontSize;
}

const STORAGE_KEYS = {
  theme: "hermes-theme",
  skin: "hermes-skin",
  fontSize: "hermes-font-size",
} as const;

export function loadThemeFromStorage(): {
  theme: ThemeMode;
  skin: string;
  fontSize: string;
} {
  if (typeof localStorage === "undefined") {
    return { theme: "system", skin: "default", fontSize: "default" };
  }
  return {
    theme: (localStorage.getItem(STORAGE_KEYS.theme) as ThemeMode) || "system",
    skin: localStorage.getItem(STORAGE_KEYS.skin) || "default",
    fontSize: localStorage.getItem(STORAGE_KEYS.fontSize) || "default",
  };
}

export function saveThemeToStorage(
  theme: ThemeMode,
  skin: string,
  fontSize: string
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  localStorage.setItem(STORAGE_KEYS.skin, skin);
  localStorage.setItem(STORAGE_KEYS.fontSize, fontSize);
}
