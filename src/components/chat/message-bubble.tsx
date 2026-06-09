"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, Pencil } from "lucide-react";
import type { Message } from "@/types";
import { MarkdownRenderer } from "./markdown-renderer";
import { ToolCallCard } from "./tool-call-card";
import { ThinkingCard } from "./thinking-card";

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function MessageBubble({ message, onEdit }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div className="text-xs font-medium text-[var(--muted)] capitalize">{message.role}</div>

      {message.reasoning && <ThinkingCard content={message.reasoning} />}

      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-3",
          isUser ? "bg-[var(--accent-bg)]" : "bg-[var(--surface)]"
        )}
      >
        {isAssistant ? (
          <div className="text-sm"><MarkdownRenderer content={message.content} /></div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isAssistant && (
          <button
            onClick={handleCopy}
            aria-label="Copy message"
            className="p-1 text-[var(--muted)] hover:text-[var(--text)]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
        {isUser && onEdit && (
          <button
            onClick={() => onEdit(message.id, message.content)}
            aria-label="Edit message"
            className="p-1 text-[var(--muted)] hover:text-[var(--text)]"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {message.tool_calls?.map((tc) => (
        <ToolCallCard key={tc.id} toolCall={tc} />
      ))}
    </div>
  );
}
