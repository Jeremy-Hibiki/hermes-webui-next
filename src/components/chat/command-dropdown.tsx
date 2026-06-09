'use client';

interface CommandDropdownProps {
  completions: string[];
  onSelect: (cmd: string) => void;
  visible: boolean;
}

export function CommandDropdown({ completions, onSelect, visible }: CommandDropdownProps) {
  if (!visible || completions.length === 0) return null;

  return (
    <div
      data-testid="command-dropdown"
      className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50"
    >
      {completions.map((cmd) => (
        <button
          key={cmd}
          onClick={() => onSelect(cmd)}
          className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          /{cmd}
        </button>
      ))}
    </div>
  );
}
