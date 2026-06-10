'use client';

import { useAtom } from 'jotai';
import { todosAtom, todoMetaAtom } from '@/atoms/chat';
import type { TodoItem } from '@/types';
import { ListTodo, Square, CheckCircle2, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

const STATUS_I18N_KEY: Record<TodoItem['status'], string> = {
  pending: 'todo.pending',
  in_progress: 'todo.pending',
  completed: 'todo.completed',
  cancelled: 'todo.pending',
};

function toggleStatus(status: TodoItem['status']): TodoItem['status'] {
  switch (status) {
    case 'pending':
      return 'completed';
    case 'completed':
      return 'pending';
    case 'in_progress':
      return 'completed';
    case 'cancelled':
      return 'pending';
  }
}

export function TodoPanel() {
  const [todos, setTodos] = useAtom(todosAtom);
  const [meta] = useAtom(todoMetaAtom);
  const { t: t18n } = useTranslation();

  const completed = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = async (todo: TodoItem) => {
    const newStatus = toggleStatus(todo.status);
    // Backend has no /todos/update endpoint; todos are SSE-driven only.
    // Perform local-only optimistic update.
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, status: newStatus } : t)));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          {t18n('todo.title')}
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
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {todos.length === 0 ? (
          <div className="p-4 text-sm text-[var(--muted)] text-center">No tasks</div>
        ) : (
          todos.map((todo) => {
            const isDone = todo.status === 'completed';
            const color =
              todo.status === 'in_progress'
                ? 'text-blue-400'
                : todo.status === 'cancelled'
                  ? 'text-[var(--error)]'
                  : 'text-[var(--muted)]';
            return (
              <div
                key={todo.id}
                className={cn(
                  'flex items-start gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]',
                  isDone && 'opacity-60',
                )}
              >
                <button
                  onClick={() => void handleToggle(todo)}
                  className="mt-0.5 shrink-0"
                  aria-label={isDone ? 'Mark as pending' : 'Mark as completed'}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : todo.status === 'in_progress' ? (
                    <Loader className={cn('w-4 h-4 animate-spin text-blue-400')} />
                  ) : (
                    <Square className={cn('w-4 h-4', color)} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'text-sm text-[var(--text)]',
                      todo.status === 'completed' && 'line-through',
                      todo.status === 'cancelled' && 'line-through opacity-70',
                    )}
                  >
                    {todo.content}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {todo.id.slice(0, 8)} &middot; {t18n(STATUS_I18N_KEY[todo.status])}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {meta && Object.keys(meta).length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
          Source: {typeof meta.source === 'string' ? meta.source : 'SSE'}
        </div>
      )}
    </div>
  );
}
