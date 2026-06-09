"use client";

import { useAtom } from "jotai";
import { themeAtom, skinAtom, fontSizeAtom } from "@/atoms/settings";
import { Settings } from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import { SkinPicker } from "./skin-picker";

export function SettingsPanel() {
  const [theme, setTheme] = useAtom(themeAtom);
  const [skin, setSkin] = useAtom(skinAtom);
  const [fontSize, setFontSize] = useAtom(fontSizeAtom);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Theme Section */}
        <div>
          <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Theme</h3>
          <ThemeSwitcher current={theme} onChange={setTheme} />
        </div>

        {/* Skin Section */}
        <div>
          <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Skin</h3>
          <SkinPicker current={skin} onChange={setSkin} />
        </div>

        {/* Font Size Section */}
        <div>
          <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Font Size</h3>
          <div className="flex gap-2">
            {(["small", "default", "large", "xlarge"] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`px-3 py-1.5 rounded text-xs border transition-colors capitalize ${
                  fontSize === size
                    ? "bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] hover:bg-[var(--hover-bg)]"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
