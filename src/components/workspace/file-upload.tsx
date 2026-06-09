"use client";

import { useRef, useCallback } from "react";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onUpload: (files: FileList) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onUpload(e.target.files);
      }
    },
    [onUpload]
  );

  return (
    <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center hover:border-[var(--accent)] transition-colors">
      <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--muted)]" />
      <p className="text-sm text-[var(--muted)] mb-2">Drop files here or</p>
      <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent)] text-white cursor-pointer hover:opacity-90">
        Choose files
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleChange}
          aria-label="Choose files"
        />
      </label>
    </div>
  );
}
