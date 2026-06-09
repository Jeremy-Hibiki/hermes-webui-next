"use client";

import { useAtom } from "jotai";
import { todosAtom, todoMetaAtom } from "@/atoms/chat";
import type { TodoItem } from "@/types";
import { ListTodo, Square, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  TodoItem["status"],
  { icon: typeof Square; color: string; label: string }
> = {
  pending: { icon: Square, color: "text-[var(--muted)]", label: "Pending" },
  in_progress: { icon: Loader2, color: "text-blue-400", label: "In Progress" },
  completed: { icon: CheckCircle2, color: "text-green-500", label: "Completed" },
  cancelled: { icon: XCircle, color: "text-[var(--error)]", label: "Cancelled" },
};

export function TodoPanel() {
  const [todos] = useAtom(todosAtom);
  const [meta] = useAtom(todoMetaAtom);

  const completed = todos.filter((t) => t.status === "completed").length;
  const total = todos.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          Todo
        </h2>
        {total > 0 && (
          <span className="text-xs text-[var(--muted)]">
            {completed}/{total} ({pct}%)
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="px-4 py-2">
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {todos.length === 0 ? (
          <div className="p-4 text-sm text-[var(--muted)] text-center">No tasks</div>
        ) : (
          todos.map((todo) => {
            const config = STATUS_CONFIG[todo.status];
            const Icon = config.icon;
            return (
              <div
                key={todo.id}
                className={cn(
                  "flex items-start gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]",
                  todo.status === "completed" && "opacity-60",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 mt-0.5",
                    config.color,
                    todo.status === "in_progress" && "animate-spin",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm text-[var(--text)]",
                      todo.status === "completed" && "line-through",
                      todo.status === "cancelled" && "line-through opacity-70",
                    )}
                  >
                    {todo.content}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {todo.id.slice(0, 8)} &middot; {config.label}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {meta && Object.keys(meta).length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
          Source: {typeof meta.source === "string" ? meta.source : "SSE"}
        </div>
      )}
    </div>
  );
}
