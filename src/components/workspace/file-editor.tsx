'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';

interface FileEditorProps {
  path: string;
  content: string;
  onSave: (path: string, content: string) => void;
  readOnly?: boolean;
}

export function FileEditor({ path, content, onSave, readOnly }: FileEditorProps) {
  const [value, setValue] = useState(content);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted)] truncate">{path}</span>
        {!readOnly && (
          <button
            onClick={() => onSave(path, value)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        readOnly={readOnly}
        className="flex-1 p-3 text-xs font-mono bg-[var(--code-bg)] text-[var(--code-text)] border-none outline-none resize-none"
        spellCheck={false}
      />
    </div>
  );
}
