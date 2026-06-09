"use client";

import { cn } from "@/lib/utils";
import { SKINS } from "@/lib/theme";

interface SkinPickerProps {
  current: string;
  onChange: (skin: string) => void;
}

/** Generate a deterministic color from skin id for swatch preview */
function skinToColor(id: string, index: number): string {
  const hue = (index * 22.5) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

export function SkinPicker({ current, onChange }: SkinPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {SKINS.map((skin, i) => (
        <button
          key={skin.id}
          onClick={() => onChange(skin.id)}
          title={skin.name}
          className={cn(
            "w-7 h-7 rounded-full border-2 transition-all cursor-pointer",
            current === skin.id
              ? "border-[var(--accent)] ring-2 ring-[var(--accent)] scale-110"
              : "border-[var(--border)] hover:scale-105"
          )}
          style={{ backgroundColor: skinToColor(skin.id, i) }}
        />
      ))}
    </div>
  );
}
