"use client";

interface StreamingCursorProps {
  streaming: boolean;
}

export function StreamingCursor({ streaming }: StreamingCursorProps) {
  if (!streaming) return null;

  return (
    <span
      data-testid="streaming-cursor"
      className="inline-block w-2 h-4 ml-0.5 rounded-sm bg-[var(--accent)] animate-pulse"
    />
  );
}
