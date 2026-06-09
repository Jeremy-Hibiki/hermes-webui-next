"use client";

import { useState, useEffect, useRef } from "react";
import type { ClarifyRequest } from "@/types";
import { HelpCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClarifyCardProps {
  request: ClarifyRequest;
  onRespond: (clarifyId: string, response: string) => void;
}

export function ClarifyCard({ request, onRespond }: ClarifyCardProps) {
  const [draft, setDraft] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (request.expires_at) {
      const expires = new Date(request.expires_at).getTime();
      const interval = setInterval(() => {
        const left = Math.max(0, Math.floor((expires - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
    if (request.timeout_seconds) {
      const seconds = request.timeout_seconds;
      setRemaining(seconds);
      const interval = setInterval(() => {
        setRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [request.expires_at, request.timeout_seconds]);

  const handleChoiceClick = (choice: string) => {
    setSubmitted(true);
    onRespond(request.clarify_id || request.id, choice);
  };

  const handleSubmit = () => {
    if (!draft.trim()) return;
    setSubmitted(true);
    onRespond(request.clarify_id || request.id, draft.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (submitted) return null;

  return (
    <div className="border border-blue-500/50 rounded-lg bg-[var(--surface)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-sm text-[var(--text)]">Clarification needed</span>
        </div>
        {remaining !== null && (
          <span
            className={cn(
              "text-xs font-mono",
              remaining <= 10 ? "text-[var(--error)]" : "text-[var(--muted)]",
            )}
          >
            {remaining}s
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--text)]">{request.question}</p>

      {request.choices && request.choices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {request.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleChoiceClick(choice)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] flex items-center justify-center text-[10px]">
                {i + 1}
              </span>
              {choice}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer..."
          className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none border border-[var(--border)] rounded-lg px-3 py-1.5"
        />
        <button
          onClick={handleSubmit}
          disabled={!draft.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:opacity-90 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </div>

      <p className="text-xs text-[var(--muted)]">Pick a choice, or type your own answer below.</p>
    </div>
  );
}
