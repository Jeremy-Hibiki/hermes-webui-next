"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/types";

interface ThemeSwitcherProps {
  current: ThemeMode;
  onChange: (theme: ThemeMode) => void;
}

const THEMES: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "system", label: "System", icon: <Monitor className="w-3 h-3" /> },
  { value: "light", label: "Light", icon: <Sun className="w-3 h-3" /> },
  { value: "dark", label: "Dark", icon: <Moon className="w-3 h-3" /> },
];

export function ThemeSwitcher({ current, onChange }: ThemeSwitcherProps) {
  return (
    <div className="flex gap-2">
      {THEMES.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded text-xs border transition-colors",
            current === value
              ? "bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--border)] hover:bg-[var(--hover-bg)]"
          )}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  );
}
