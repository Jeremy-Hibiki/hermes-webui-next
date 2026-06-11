'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Plus,
  X,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Archive,
  LayoutGrid,
  Zap,
  Filter,
  User,
  Lock,
  MessageSquare,
  Link2,
  Users,
  LayoutList,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  KanbanSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from '@/lib/i18n';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useKanbanSSE, type SSEConnectionStatus } from '@/hooks/use-kanban-sse';
import type { KanbanTask, KanbanColumn, KanbanBoard, KanbanStats, KanbanComment, KanbanConfig } from '@/types';
import { t } from '@/lib/i18n';

const COLUMNS: KanbanColumn[] = [
  { id: 'triage', label: 'Triage' },
  { id: 'todo', label: 'To Do' },
  { id: 'ready', label: 'Ready' },
  { id: 'running', label: 'Running' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
];

function getTranslatedColumnLabel(id: string): string {
  const key = `kanban.status.${id}` as const;
  return t(key) || id;
}

const STATUS_ORDER = ['triage', 'todo', 'ready', 'running', 'done'];

function nextStatus(current: string): string | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

function stalenessClass(task: KanbanTask): string {
  if (!task.updated_at && !task.created_at) return '';
  const updated = new Date(task.updated_at || task.created_at || 0).getTime();
  if (!updated) return '';
  const hours = (Date.now() - updated) / 3600000;
  if (hours > 24) return 'border-l-2 border-l-red-500';
  if (hours > 4) return 'border-l-2 border-l-amber-500';
  return '';
}

// ── Simple inline markdown ──

function renderInlineMarkdown(text: string): string {
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="text-[var(--accent)] hover:underline">$1</a>',
    );
  return html;
}

// ── Sortable Card ──

function TaskCard({
  task,
  onClick,
  selected,
  onToggleSelect,
  multiSelect,
  onQuickAdvance,
  onQuickArchive,
}: {
  task: KanbanTask;
  onClick: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  multiSelect: boolean;
  onQuickAdvance: () => void;
  onQuickArchive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityBorder =
    task.priority === 'high'
      ? 'border-l-2 border-l-red-500'
      : task.priority === 'low'
        ? 'border-l-2 border-l-blue-400'
        : '';

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-2 p-2.5 rounded-[9px] border border-[var(--border)] bg-[var(--bg)] cursor-pointer hover:border-[var(--accent)] transition-colors text-left w-full',
        priorityBorder || stalenessClass(task),
        selected && 'ring-2 ring-[var(--accent)]',
      )}
      onClick={multiSelect ? onToggleSelect : onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      {multiSelect && (
        <button
          className="mt-0.5 shrink-0 text-[var(--muted)]"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          aria-label={selected ? 'Deselect task' : 'Select task'}
        >
          {selected ? <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Square className="w-3.5 h-3.5" />}
        </button>
      )}
      <button
        className="mt-0.5 text-[var(--muted)] cursor-grab active:cursor-grabbing"
        aria-label="Drag task"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[13px] font-semibold text-[var(--text)] truncate leading-tight">{task.title}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <code className="text-[9px] text-[var(--muted)] font-mono opacity-60">{task.id.slice(0, 8)}</code>
          {task.priority && task.priority !== 'normal' && (
            <span
              className={cn(
                'text-[9px] px-1 py-px rounded font-semibold',
                task.priority === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-blue-400/15 text-blue-400',
              )}
            >
              {task.priority === 'high' ? 'P1' : 'P3'}
            </span>
          )}
          {task.tenant && (
            <span className="text-[9px] px-1 py-px rounded bg-[var(--input-bg)] text-[var(--muted)]">
              {task.tenant}
            </span>
          )}
        </div>
        {task.body && (
          <p className="text-[11px] text-[var(--muted)] mt-1 leading-snug line-clamp-2">
            {task.body.length > 120 ? task.body.slice(0, 120) + '…' : task.body}
          </p>
        )}
        {(task.assignee || task.age) && (
          <p className="text-[10px] text-[var(--muted)] mt-0.5">
            {task.assignee && <span>@{task.assignee}</span>}
            {task.assignee && task.age && <span> · </span>}
            {task.age && <span>{task.age}</span>}
          </p>
        )}
        {(task.comment_count || (task.link_counts && task.link_counts.children)) && (
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--muted)]">
            {task.comment_count ? (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
                {task.comment_count}
              </span>
            ) : null}
            {task.link_counts && task.link_counts.children ? (
              <span className="flex items-center gap-0.5">
                <Link2 className="w-3 h-3" />
                {task.link_counts.children}
              </span>
            ) : null}
          </div>
        )}
      </div>
      {!multiSelect && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {nextStatus(task.status) && (
            <button
              className="p-0.5 rounded hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--text)]"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdvance();
              }}
              aria-label={`Move to ${nextStatus(task.status)}`}
              title={`Move to ${nextStatus(task.status)}`}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          <button
            className="p-0.5 rounded hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              onQuickArchive();
            }}
            aria-label="Archive task"
            title="Archive"
          >
            <Archive className="w-3 h-3" />
          </button>
        </div>
      )}
    </button>
  );
}

// ── Column ──

function KanbanColumnView({
  column,
  tasks,
  onCreateTask,
  onTaskClick,
  multiSelect,
  selectedIds,
  onToggleSelect,
  onQuickAdvance,
  onQuickArchive,
}: {
  column: KanbanColumn;
  tasks: KanbanTask[];
  onCreateTask: (status: string) => void;
  onTaskClick: (task: KanbanTask) => void;
  multiSelect: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onQuickAdvance: (task: KanbanTask) => void;
  onQuickArchive: (task: KanbanTask) => void;
}) {
  return (
    <div className="flex flex-col min-w-[82vw] md:min-w-[260px] max-w-[320px] flex-1 bg-[var(--bg)] rounded-[10px] border border-[var(--border)] min-h-[240px] snap-start">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <h3 className="text-xs font-semibold text-[var(--text)]">
          {getTranslatedColumnLabel(column.id)}
          <span className="ml-1.5 text-[var(--muted)] font-normal">{tasks.length}</span>
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-[var(--muted)]"
          onClick={() => onCreateTask(column.id)}
          aria-label={`Add task to ${getTranslatedColumnLabel(column.id)}`}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px] max-h-[60vh]">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              selected={selectedIds.has(task.id)}
              onToggleSelect={() => onToggleSelect(task.id)}
              multiSelect={multiSelect}
              onQuickAdvance={() => onQuickAdvance(task)}
              onQuickArchive={() => onQuickArchive(task)}
            />
          ))}
          {tasks.length === 0 && <p className="text-[10px] text-[var(--muted)] text-center py-4">No tasks</p>}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Task Modal (create/edit) ──

function TaskModal({
  task,
  status,
  onClose,
  onSave,
  assignees,
}: {
  task?: KanbanTask;
  status: string;
  onClose: () => void;
  onSave: (data: { title: string; body?: string; status: string; priority?: string; assignee?: string }) => void;
  assignees: string[];
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [body, setBody] = useState(task?.body ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'normal');
  const [assignee, setAssignee] = useState(task?.assignee ?? '');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      body: body.trim() || undefined,
      status,
      priority,
      assignee: assignee.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-96 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text)]">{task ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="text-[var(--muted)] hover:text-[var(--text)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="task-title" className="block text-xs font-medium text-[var(--text)] mb-1">
              Title
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>
          <div>
            <label htmlFor="task-body" className="block text-xs font-medium text-[var(--text)] mb-1">
              Description
            </label>
            <textarea
              id="task-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="task-priority" className="block text-xs font-medium text-[var(--text)] mb-1">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="task-assignee" className="block text-xs font-medium text-[var(--text)] mb-1">
                Assignee
              </label>
              <select
                id="task-assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {task ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Task Detail Panel ──

function TaskDetailPanel({
  task,
  onClose,
  onRefresh,
  onEdit,
}: {
  task: KanbanTask;
  onClose: () => void;
  onRefresh: () => void;
  onEdit: () => void;
}) {
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<KanbanComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher<{ task: KanbanTask; comments?: KanbanComment[] }>(`/kanban/tasks/${encodeURIComponent(task.id)}`)
      .then((data) => {
        if (cancelled) return;
        if (data.comments) setComments(data.comments);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  const handleAddComment = useCallback(async () => {
    if (!comment.trim()) return;
    try {
      const res = await apiPost<{ comment: KanbanComment }>(`/kanban/tasks/${encodeURIComponent(task.id)}/comments`, {
        body: comment.trim(),
      } as unknown as Record<string, unknown>);
      setComments((prev) => [...prev, res.comment]);
      setComment('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to add comment', 'error');
    }
  }, [task.id, comment, toast]);

  const handleBlock = useCallback(async () => {
    try {
      await apiPost(`/kanban/tasks/${encodeURIComponent(task.id)}/block`, {} as Record<string, unknown>);
      toast('Task blocked', 'success');
      onRefresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to block', 'error');
    }
  }, [task.id, toast, onRefresh]);

  const handleUnblock = useCallback(async () => {
    try {
      await apiPost(`/kanban/tasks/${encodeURIComponent(task.id)}/unblock`, {} as Record<string, unknown>);
      toast('Task unblocked', 'success');
      onRefresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to unblock', 'error');
    }
  }, [task.id, toast, onRefresh]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-[400px] h-full bg-[var(--surface)] border-l border-[var(--border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text)] truncate">{task.title}</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[var(--muted)] hover:text-[var(--text)]"
              onClick={onEdit}
              aria-label="Edit task"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <button
              onClick={onClose}
              className="text-[var(--muted)] hover:text-[var(--text)]"
              aria-label="Close detail"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status & meta */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
              {task.status}
            </span>
            {task.priority && task.priority !== 'normal' && (
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-semibold rounded-full',
                  task.priority === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-blue-400/10 text-blue-400',
                )}
              >
                {task.priority}
              </span>
            )}
            {task.assignee && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--hover-bg)] text-[var(--muted)]">
                <User className="w-3 h-3 inline mr-1" />
                {task.assignee}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {task.status !== 'blocked' && (
              <Button variant="outline" size="sm" onClick={() => void handleBlock()}>
                Block
              </Button>
            )}
            {task.status === 'blocked' && (
              <Button variant="outline" size="sm" onClick={() => void handleUnblock()}>
                Unblock
              </Button>
            )}
          </div>

          {/* Body */}
          {task.body && (
            <div className="text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap">
              <div dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(task.body) }} />
            </div>
          )}

          {/* Timestamps */}
          <div className="text-[10px] text-[var(--muted)] space-y-1">
            {task.created_at && <p>Created: {new Date(task.created_at).toLocaleString()}</p>}
            {task.updated_at && <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>}
          </div>

          {/* Comments */}
          <div className="border-t border-[var(--border)] pt-3">
            <h4 className="text-xs font-semibold text-[var(--text)] mb-2">Comments ({comments.length})</h4>
            {loading ? (
              <p className="text-[10px] text-[var(--muted)]">Loading...</p>
            ) : (
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <div className="flex items-center gap-1 mb-1">
                      {c.author && <span className="text-[10px] font-medium text-[var(--text)]">{c.author}</span>}
                      {c.created_at && (
                        <span className="text-[10px] text-[var(--muted)]">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text)]">{c.body}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-[10px] text-[var(--muted)]">No comments</p>}
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              aria-label="Add comment"
              className="flex-1 px-2 py-1.5 text-xs border border-[var(--border)] rounded bg-[var(--input-bg)] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddComment();
              }}
            />
            <Button size="sm" disabled={!comment.trim()} onClick={() => void handleAddComment()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Board Switcher ──

function BoardSwitcher({
  boards,
  currentBoard,
  onSwitch,
  onCreate,
}: {
  boards: KanbanBoard[];
  currentBoard: string | null;
  onSwitch: (slug: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = boards.find((b) => b.slug === currentBoard) ?? boards[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors"
        onClick={() => setOpen(!open)}
        aria-label="Switch board"
      >
        <LayoutGrid className="w-3.5 h-3.5 text-[var(--muted)]" />
        {current?.name ?? 'Board'}
        <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50 py-1">
          {boards.map((b) => (
            <button
              key={b.slug}
              className={cn(
                'w-full text-left px-3 py-2 text-xs hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-between',
                b.slug === currentBoard && 'text-[var(--accent)]',
              )}
              onClick={() => {
                onSwitch(b.slug);
                setOpen(false);
              }}
            >
              <span className="flex items-center gap-2">
                {b.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />}
                {b.name}
              </span>
              <span className="text-[10px] text-[var(--muted)]">{b.total ?? 0}</span>
            </button>
          ))}
          <div className="border-t border-[var(--border)] mt-1 pt-1">
            <button
              className="w-full text-left px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--hover-bg)] flex items-center gap-2"
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
            >
              <Plus className="w-3 h-3" /> New board
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Board Modal ──

function CreateBoardModal({ onClose, onCreated }: { onClose: () => void; onCreated: (slug: string) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '');
      await apiPost('/kanban/boards', { slug, name: name.trim(), switch: true } as Record<string, unknown>);
      onCreated(slug);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create board', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-80 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-[var(--text)]">New Board</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Board name"
          autoFocus
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!name.trim() || busy}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ──

function StatsBar({ stats, connectionStatus }: { stats?: KanbanStats; connectionStatus: SSEConnectionStatus }) {
  const total = stats ? Object.values(stats.by_status).reduce((a, b) => a + b, 0) : 0;

  const statusDot = {
    connected: { color: 'bg-green-500', label: 'Connected' },
    disconnected: { color: 'bg-red-500', label: 'Disconnected' },
    reconnecting: { color: 'bg-yellow-500', label: 'Reconnecting' },
  }[connectionStatus];

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[var(--border)] text-[10px] text-[var(--muted)]">
      {stats && total > 0 && (
        <>
          <span className="font-semibold">{total} tasks</span>
          {COLUMNS.map((col) => {
            const count = stats.by_status[col.id] ?? 0;
            if (count === 0) return null;
            return (
              <span key={col.id}>
                {col.label}: <strong className="text-[var(--text)]">{count}</strong>
              </span>
            );
          })}
        </>
      )}
      <span className="ml-auto flex items-center gap-1" title={statusDot.label}>
        <span className={cn('inline-block w-1.5 h-1.5 rounded-full', statusDot.color)} />
        <span>{statusDot.label}</span>
      </span>
    </div>
  );
}

// ── Swimlane Column (grouped by assignee) ──

function SwimlaneColumn({
  assignee,
  tasks,
  onTaskClick,
  multiSelect,
  selectedIds,
  onToggleSelect,
  onQuickAdvance,
  onQuickArchive,
}: {
  assignee: string;
  tasks: KanbanTask[];
  onTaskClick: (task: KanbanTask) => void;
  multiSelect: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onQuickAdvance: (task: KanbanTask) => void;
  onQuickArchive: (task: KanbanTask) => void;
}) {
  const tasksByStatus = useMemo(() => {
    const map: Record<string, KanbanTask[]> = {};
    for (const col of COLUMNS) map[col.id] = [];
    for (const t of tasks) {
      const status = map[t.status] ? t.status : 'triage';
      map[status]?.push(t);
    }
    return map;
  }, [tasks]);

  return (
    <div className="flex flex-col min-w-[260px] bg-[var(--bg)] rounded-[10px] border border-[var(--border)]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <User className="w-3.5 h-3.5 text-[var(--muted)]" />
        <span className="text-xs font-semibold text-[var(--text)]">{assignee || 'Unassigned'}</span>
        <span className="text-[10px] text-[var(--muted)] ml-auto">{tasks.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus[col.id] ?? [];
          if (colTasks.length === 0) return null;
          return (
            <div key={col.id} className="mb-2">
              <div className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide px-1 mb-1">
                {col.label} ({colTasks.length})
              </div>
              {colTasks.map((task) => (
                <div key={task.id} className="mb-1">
                  <SimpleTaskCard
                    task={task}
                    onClick={() => onTaskClick(task)}
                    selected={selectedIds.has(task.id)}
                    onToggleSelect={() => onToggleSelect(task.id)}
                    multiSelect={multiSelect}
                    onQuickAdvance={() => onQuickAdvance(task)}
                    onQuickArchive={() => onQuickArchive(task)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimpleTaskCard({
  task,
  onClick,
  selected,
  onToggleSelect,
  multiSelect,
  onQuickAdvance,
  onQuickArchive,
}: {
  task: KanbanTask;
  onClick: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  multiSelect: boolean;
  onQuickAdvance: () => void;
  onQuickArchive: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'group flex items-start gap-2 p-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg)] cursor-pointer hover:border-[var(--accent)] transition-colors text-left w-full',
        selected && 'ring-2 ring-[var(--accent)]',
      )}
      onClick={multiSelect ? onToggleSelect : onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      {multiSelect && (
        <button
          className="mt-0.5 shrink-0 text-[var(--muted)]"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
        >
          {selected ? <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Square className="w-3.5 h-3.5" />}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[var(--text)] truncate leading-tight">{task.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[9px] px-1 py-px rounded bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
            {task.status}
          </span>
          {task.priority && task.priority !== 'normal' && (
            <span
              className={cn(
                'text-[9px] px-1 py-px rounded font-semibold',
                task.priority === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-blue-400/15 text-blue-400',
              )}
            >
              {task.priority === 'high' ? 'P1' : 'P3'}
            </span>
          )}
        </div>
        {(task.comment_count || (task.link_counts && task.link_counts.children)) && (
          <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[var(--muted)]">
            {task.comment_count ? (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-2.5 h-2.5" />
                {task.comment_count}
              </span>
            ) : null}
            {task.link_counts && task.link_counts.children ? (
              <span className="flex items-center gap-0.5">
                <Link2 className="w-2.5 h-2.5" />
                {task.link_counts.children}
              </span>
            ) : null}
          </div>
        )}
      </div>
      {!multiSelect && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {nextStatus(task.status) && (
            <button
              className="p-0.5 rounded hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--text)]"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdvance();
              }}
              aria-label={`Move to ${nextStatus(task.status)}`}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          <button
            className="p-0.5 rounded hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              onQuickArchive();
            }}
            aria-label="Archive task"
          >
            <Archive className="w-3 h-3" />
          </button>
        </div>
      )}
    </button>
  );
}

// ── Sortable Table List View ──

type SortField = 'id' | 'title' | 'priority' | 'assignee' | 'status' | 'age';
type SortDir = 'asc' | 'desc';

const PRIORITY_SORT: Record<string, number> = { high: 0, normal: 1, low: 2 };

function KanbanListView({
  tasks,
  onTaskClick,
  multiSelect,
  selectedIds,
  onToggleSelect,
  onQuickAdvance,
  onQuickArchive,
}: {
  tasks: KanbanTask[];
  onTaskClick: (task: KanbanTask) => void;
  multiSelect: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onQuickAdvance: (task: KanbanTask) => void;
  onQuickArchive: (task: KanbanTask) => void;
}) {
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortDir('asc');
      }
      return field;
    });
  }, []);

  const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'id':
          cmp = a.id.localeCompare(b.id);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'priority': {
          const pa = PRIORITY_SORT[a.priority ?? 'normal'] ?? 1;
          const pb = PRIORITY_SORT[b.priority ?? 'normal'] ?? 1;
          cmp = pa - pb;
          break;
        }
        case 'assignee':
          cmp = (a.assignee ?? '').localeCompare(b.assignee ?? '');
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'age': {
          const ageA = a.age ?? '';
          const ageB = b.age ?? '';
          cmp = ageA.localeCompare(ageB);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [tasks, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const thClass =
    'text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-2 py-2 cursor-pointer hover:text-[var(--text)] select-none whitespace-nowrap';
  const tdClass = 'text-xs px-2 py-2 border-b border-[var(--border)]';

  return (
    <div className="flex-1 overflow-auto">
      {tasks.length === 0 ? (
        <p className="text-[10px] text-[var(--muted)] text-center py-4">No tasks</p>
      ) : (
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)]">
            <tr>
              {multiSelect && <th className={thClass + ' w-8'}></th>}
              <th className={thClass} onClick={() => handleSort('id')}>
                <span className="inline-flex items-center gap-1">
                  ID <SortIcon field="id" />
                </span>
              </th>
              <th className={thClass} onClick={() => handleSort('title')}>
                <span className="inline-flex items-center gap-1">
                  Title <SortIcon field="title" />
                </span>
              </th>
              <th className={thClass} onClick={() => handleSort('priority')}>
                <span className="inline-flex items-center gap-1">
                  Priority <SortIcon field="priority" />
                </span>
              </th>
              <th className={thClass} onClick={() => handleSort('assignee')}>
                <span className="inline-flex items-center gap-1">
                  Assignee <SortIcon field="assignee" />
                </span>
              </th>
              <th className={thClass} onClick={() => handleSort('status')}>
                <span className="inline-flex items-center gap-1">
                  Status <SortIcon field="status" />
                </span>
              </th>
              <th className={thClass} onClick={() => handleSort('age')}>
                <span className="inline-flex items-center gap-1">
                  Age <SortIcon field="age" />
                </span>
              </th>
              <th className={thClass + ' w-16'}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => (
              <tr
                key={task.id}
                className={cn(
                  'hover:bg-[var(--hover-bg)] cursor-pointer transition-colors',
                  selectedIds.has(task.id) && 'bg-[var(--accent-bg)]',
                )}
                onClick={multiSelect ? () => onToggleSelect(task.id) : () => onTaskClick(task)}
              >
                {multiSelect && (
                  <td className={tdClass}>
                    <button
                      className="text-[var(--muted)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(task.id);
                      }}
                      aria-label={selectedIds.has(task.id) ? 'Deselect' : 'Select'}
                    >
                      {selectedIds.has(task.id) ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                )}
                <td className={tdClass}>
                  <code className="text-[10px] font-mono text-[var(--muted)]">{task.id.slice(0, 8)}</code>
                </td>
                <td className={cn(tdClass, 'max-w-[300px]')}>
                  <span className="font-medium text-[var(--text)] truncate block">{task.title}</span>
                </td>
                <td className={tdClass}>
                  {task.priority && task.priority !== 'normal' ? (
                    <span
                      className={cn(
                        'text-[9px] px-1 py-px rounded font-semibold',
                        task.priority === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-blue-400/15 text-blue-400',
                      )}
                    >
                      {task.priority === 'high' ? 'P1' : 'P3'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-[var(--muted)]">P2</span>
                  )}
                </td>
                <td className={tdClass}>
                  <span className="text-[var(--muted)]">{task.assignee ? `@${task.assignee}` : '—'}</span>
                </td>
                <td className={tdClass}>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
                    {task.status}
                  </span>
                </td>
                <td className={tdClass}>
                  <span className="text-[var(--muted)]">{task.age || '—'}</span>
                </td>
                <td className={tdClass}>
                  <div className="flex items-center gap-0.5">
                    {nextStatus(task.status) && (
                      <button
                        className="p-0.5 rounded hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--text)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdvance(task);
                        }}
                        title={`Move to ${nextStatus(task.status)}`}
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      className="p-0.5 rounded hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickArchive(task);
                      }}
                      title="Archive"
                    >
                      <Archive className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main Board ──

export function KanbanBoard() {
  const { toast } = useToast();
  const { t: t18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState('triage');
  const [editingTask, setEditingTask] = useState<KanbanTask | undefined>();
  const [detailTask, setDetailTask] = useState<KanbanTask | undefined>();
  const [currentBoard, setCurrentBoard] = useState<string | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickCreate, setQuickCreate] = useState('');
  const quickCreateRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [lanesByProfile, setLanesByProfile] = useState(false);

  const boardQuery = currentBoard ? `?board=${encodeURIComponent(currentBoard)}` : '';

  const {
    data: boardData,
    mutate,
    isLoading: boardLoading,
  } = useSWR<{ tasks: KanbanTask[] }>(`/kanban/board${boardQuery}`, fetcher, { revalidateOnFocus: false });

  const { data: boardsData, mutate: mutateBoards } = useSWR<{ boards: KanbanBoard[]; current: string }>(
    '/kanban/boards',
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: statsData } = useSWR<KanbanStats>(`/kanban/stats${boardQuery}`, fetcher, { revalidateOnFocus: false });

  const { data: assigneesData } = useSWR<{ assignees: string[] }>('/kanban/assignees', fetcher, {
    revalidateOnFocus: false,
  });

  const { data: configData } = useSWR<KanbanConfig>(`/kanban/config${boardQuery}`, fetcher, {
    revalidateOnFocus: false,
  });

  // SSE real-time updates
  const { connectionStatus } = useKanbanSSE({
    board: currentBoard,
    enabled: true,
    onEvents: useCallback(() => {
      void mutate();
    }, [mutate]),
  });

  // Sync current board from API
  useEffect(() => {
    if (boardsData?.current && !currentBoard) {
      setCurrentBoard(boardsData.current);
    }
  }, [boardsData, currentBoard]);

  // Apply config defaults
  useEffect(() => {
    if (configData?.lane_by_profile) setLanesByProfile(true);
  }, [configData]);

  const boards = boardsData?.boards ?? [];
  const assignees = assigneesData?.assignees ?? [];
  const stats = statsData;
  const tasks = useMemo(() => boardData?.tasks ?? [], [boardData]);
  const currentBoardObj = boards.find((b) => b.slug === currentBoard);
  const isReadOnly = currentBoardObj?.read_only ?? false;

  const filtered = useMemo(() => {
    let result = tasks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.body?.toLowerCase().includes(q),
      );
    }
    if (assigneeFilter) {
      result = result.filter((t) => t.assignee === assigneeFilter);
    }
    return result;
  }, [tasks, search, assigneeFilter]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, KanbanTask[]> = {};
    for (const col of COLUMNS) map[col.id] = [];
    for (const t of filtered) {
      const status = map[t.status] ? t.status : 'triage';
      map[status]?.push(t);
    }
    return map;
  }, [filtered]);

  const tasksByAssignee = useMemo(() => {
    const map: Record<string, KanbanTask[]> = {};
    for (const t of filtered) {
      const key = t.assignee || '';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [filtered]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over?.id) return;

      const taskId = String(active.id);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      let targetStatus: string | undefined;
      for (const col of COLUMNS) {
        if (tasksByStatus[col.id]?.some((t) => t.id === over.id)) {
          targetStatus = col.id;
          break;
        }
      }
      if (!targetStatus) {
        for (const col of COLUMNS) {
          if (over.id === col.id) {
            targetStatus = col.id;
            break;
          }
        }
      }

      if (!targetStatus || targetStatus === task.status) return;

      const optimistic = tasks.map((t) => (t.id === taskId ? { ...t, status: targetStatus! } : t));
      void mutate({ tasks: optimistic }, false);

      try {
        await apiPost(`/kanban/tasks/${taskId}/patch`, {
          status: targetStatus,
          ...(currentBoard ? { board: currentBoard } : {}),
        } as unknown as Record<string, unknown>);
        void mutate();
      } catch (e) {
        void mutate();
        toast(e instanceof Error ? e.message : 'Failed to move task', 'error');
      }
    },
    [tasks, tasksByStatus, mutate, currentBoard, toast],
  );

  const handleCreateTask = useCallback((status: string) => {
    setModalStatus(status);
    setEditingTask(undefined);
    setShowModal(true);
  }, []);

  const handleTaskClick = useCallback((task: KanbanTask) => {
    setDetailTask(task);
  }, []);

  const handleSaveTask = useCallback(
    async (data: { title: string; body?: string; status: string; priority?: string; assignee?: string }) => {
      try {
        const body = { ...data, ...(currentBoard ? { board: currentBoard } : {}) };
        if (editingTask) {
          await apiPost(`/kanban/tasks/${editingTask.id}/patch`, body as unknown as Record<string, unknown>);
        } else {
          await apiPost('/kanban/tasks', body as unknown as Record<string, unknown>);
        }
        void mutate();
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to save task', 'error');
      }
    },
    [editingTask, mutate, currentBoard, toast],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await apiPost(`/kanban/tasks/${taskId}/patch`, {
          status: 'archived',
          ...(currentBoard ? { board: currentBoard } : {}),
        } as unknown as Record<string, unknown>);
        void mutate();
        setShowModal(false);
        setDetailTask(undefined);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to archive task', 'error');
      }
    },
    [mutate, currentBoard, toast],
  );

  const handleQuickAdvance = useCallback(
    (task: KanbanTask) => {
      const next = nextStatus(task.status);
      if (!next) return;
      const optimistic = tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t));
      void mutate({ tasks: optimistic }, false);
      void apiPost(`/kanban/tasks/${task.id}/patch`, {
        status: next,
        ...(currentBoard ? { board: currentBoard } : {}),
      } as unknown as Record<string, unknown>)
        .then(() => mutate())
        .catch(() => mutate());
    },
    [tasks, mutate, currentBoard],
  );

  const handleQuickArchive = useCallback(
    (task: KanbanTask) => {
      const optimistic = tasks.filter((t) => t.id !== task.id);
      void mutate({ tasks: optimistic }, false);
      void apiPost(`/kanban/tasks/${task.id}/patch`, {
        status: 'archived',
        ...(currentBoard ? { board: currentBoard } : {}),
      } as unknown as Record<string, unknown>)
        .then(() => mutate())
        .catch(() => mutate());
    },
    [tasks, mutate, currentBoard],
  );

  const handleSwitchBoard = useCallback(
    async (slug: string) => {
      try {
        await apiPost(`/kanban/boards/${encodeURIComponent(slug)}/switch`, {} as Record<string, unknown>);
        setCurrentBoard(slug);
        void mutateBoards();
        void mutate();
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to switch board', 'error');
      }
    },
    [mutate, mutateBoards, toast],
  );

  const handleDispatch = useCallback(async () => {
    try {
      const result = await apiPost<{ spawned?: number; skipped?: number; message?: string }>(
        `/kanban/dispatch${boardQuery}`,
        {} as Record<string, unknown>,
      );
      toast(result.message ?? `Dispatched ${result.spawned ?? 0} tasks`, 'success');
      void mutate();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Dispatch failed', 'error');
    }
  }, [boardQuery, mutate, toast]);

  const handleBulkUpdate = useCallback(
    async (updates: { status?: string; assignee?: string }) => {
      if (selectedIds.size === 0) return;
      try {
        await apiPost('/kanban/tasks/bulk', {
          ids: [...selectedIds],
          ...updates,
          ...(currentBoard ? { board: currentBoard } : {}),
        } as Record<string, unknown>);
        setSelectedIds(new Set());
        setMultiSelect(false);
        void mutate();
        toast(`Updated ${selectedIds.size} tasks`, 'success');
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Bulk update failed', 'error');
      }
    },
    [selectedIds, currentBoard, mutate, toast],
  );

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleQuickCreate = useCallback(async () => {
    const title = quickCreate.trim();
    if (!title) {
      handleCreateTask('triage');
      return;
    }
    try {
      await apiPost('/kanban/tasks', {
        title,
        status: 'triage',
        ...(currentBoard ? { board: currentBoard } : {}),
      } as unknown as Record<string, unknown>);
      setQuickCreate('');
      void mutate();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create task', 'error');
    }
  }, [quickCreate, currentBoard, mutate, toast, handleCreateTask]);

  return (
    <div className="flex flex-col h-full" aria-label="Kanban">
      {/* Read-only banner */}
      {isReadOnly && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 text-xs font-medium">
          <Lock className="w-3.5 h-3.5" />
          This board is read-only. Changes are disabled.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <KanbanSquare className="w-4 h-4" />
            {t18n('kanban.title')}
          </h2>
          <BoardSwitcher
            boards={boards}
            currentBoard={currentBoard}
            onSwitch={handleSwitchBoard}
            onCreate={() => setShowCreateBoard(true)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="text-xs rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] w-40"
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', showFilters && 'text-[var(--accent)]')}
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filters"
          >
            <Filter className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', viewMode === 'list' && 'text-[var(--accent)]')}
            onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
            aria-label={viewMode === 'board' ? 'List view' : 'Board view'}
            title={viewMode === 'board' ? 'Switch to list view' : 'Switch to board view'}
          >
            {viewMode === 'board' ? <LayoutList className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
          </Button>
          {viewMode === 'board' && (
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', lanesByProfile && 'text-[var(--accent)]')}
              onClick={() => setLanesByProfile(!lanesByProfile)}
              aria-label="Toggle swimlanes by assignee"
              title="Toggle swimlanes by assignee"
            >
              <Users className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', multiSelect && 'text-[var(--accent)]')}
            onClick={() => {
              setMultiSelect(!multiSelect);
              setSelectedIds(new Set());
            }}
            aria-label="Multi-select"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--muted)]"
            onClick={() => void handleDispatch()}
            aria-label="Dispatch"
          >
            <Zap className="w-3.5 h-3.5" />
          </Button>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={() => handleCreateTask('triage')}>
              <Plus className="w-3 h-3 mr-1" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)]">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
            aria-label="Filter by assignee"
          >
            <option value="">All assignees</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={lanesByProfile}
              onChange={(e) => setLanesByProfile(e.target.checked)}
              className="rounded"
            />
            Swimlanes by assignee
          </label>
        </div>
      )}

      {/* Stats bar */}
      <StatsBar stats={stats} connectionStatus={connectionStatus} />

      {/* Quick-create row */}
      {!isReadOnly && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--border)]">
          <input
            ref={quickCreateRef}
            value={quickCreate}
            onChange={(e) => setQuickCreate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleQuickCreate();
            }}
            placeholder="Quick create task..."
            aria-label="Quick create task"
            className="flex-1 text-xs rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-[var(--muted)]"
            onClick={() => void handleQuickCreate()}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      )}

      {/* Board / List / Swimlanes */}
      {boardLoading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted)]">Loading board...</div>
      ) : viewMode === 'list' ? (
        <KanbanListView
          tasks={filtered}
          onTaskClick={handleTaskClick}
          multiSelect={multiSelect}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onQuickAdvance={isReadOnly ? () => {} : handleQuickAdvance}
          onQuickArchive={isReadOnly ? () => {} : handleQuickArchive}
        />
      ) : lanesByProfile ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 snap-x snap-mandatory">
          <div className="flex gap-4 h-full">
            {Object.entries(tasksByAssignee).map(([assignee, assigneeTasks]) => (
              <SwimlaneColumn
                key={assignee || '__unassigned__'}
                assignee={assignee}
                tasks={assigneeTasks}
                onTaskClick={handleTaskClick}
                multiSelect={multiSelect}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onQuickAdvance={isReadOnly ? () => {} : handleQuickAdvance}
                onQuickArchive={isReadOnly ? () => {} : handleQuickArchive}
              />
            ))}
          </div>
        </div>
      ) : isReadOnly ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 snap-x snap-mandatory">
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => (
              <KanbanColumnView
                key={col.id}
                column={col}
                tasks={tasksByStatus[col.id] ?? []}
                onCreateTask={() => {}}
                onTaskClick={handleTaskClick}
                multiSelect={multiSelect}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onQuickAdvance={() => {}}
                onQuickArchive={() => {}}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 snap-x snap-mandatory">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {COLUMNS.map((col) => (
                <KanbanColumnView
                  key={col.id}
                  column={col}
                  tasks={tasksByStatus[col.id] ?? []}
                  onCreateTask={handleCreateTask}
                  onTaskClick={handleTaskClick}
                  multiSelect={multiSelect}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onQuickAdvance={handleQuickAdvance}
                  onQuickArchive={handleQuickArchive}
                />
              ))}
            </div>
          </DndContext>
        </div>
      )}

      {/* Bulk action bar */}
      {!isReadOnly && multiSelect && selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--surface)]">
          <span className="text-xs text-[var(--muted)]">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleBulkUpdate({ status: 'ready' })}>
              Move to Ready
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleBulkUpdate({ status: 'done' })}>
              Mark Done
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 border-red-400/30 hover:bg-red-500/10"
              onClick={() => {
                if (window.confirm(`Archive ${selectedIds.size} tasks?`)) {
                  void (async () => {
                    try {
                      await apiPost('/kanban/tasks/bulk', {
                        ids: [...selectedIds],
                        archive: true,
                        ...(currentBoard ? { board: currentBoard } : {}),
                      } as Record<string, unknown>);
                      setSelectedIds(new Set());
                      setMultiSelect(false);
                      void mutate();
                      toast('Tasks archived', 'success');
                    } catch (e) {
                      toast(e instanceof Error ? e.message : 'Archive failed', 'error');
                    }
                  })();
                }
              }}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Archive
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <TaskModal
          task={editingTask}
          status={modalStatus}
          onClose={() => setShowModal(false)}
          onSave={handleSaveTask}
          assignees={assignees}
        />
      )}

      {editingTask && showModal && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <Button variant="destructive" size="sm" onClick={() => void handleDeleteTask(editingTask.id)}>
            <Trash2 className="w-3 h-3 mr-1" /> Archive
          </Button>
        </div>
      )}

      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          onClose={() => setDetailTask(undefined)}
          onRefresh={() => {
            void mutate();
            setDetailTask(undefined);
          }}
          onEdit={() => {
            setEditingTask(detailTask);
            setModalStatus(detailTask.status);
            setDetailTask(undefined);
            setShowModal(true);
          }}
        />
      )}

      {showCreateBoard && (
        <CreateBoardModal
          onClose={() => setShowCreateBoard(false)}
          onCreated={(slug) => {
            setCurrentBoard(slug);
            void mutateBoards();
            void mutate();
          }}
        />
      )}
    </div>
  );
}
