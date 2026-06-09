"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { fetcher, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Plus, X, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ──

interface KanbanTask {
  id: string;
  title: string;
  body?: string;
  status: string;
  assignee?: string;
  tenant?: string;
  priority?: string;
  age?: string;
  progress?: number;
}

interface KanbanColumn {
  id: string;
  label: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: "triage", label: "Triage" },
  { id: "todo", label: "To Do" },
  { id: "ready", label: "Ready" },
  { id: "running", label: "Running" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

// ── Sortable Card ──

function TaskCard({ task, onClick }: { task: KanbanTask; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      className={cn(
        "group flex items-start gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer hover:border-[var(--accent)] transition-colors",
        task.priority === "high" && "border-l-2 border-l-red-500",
        task.priority === "low" && "border-l-2 border-l-blue-400",
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
    >
      <button
        className="mt-0.5 text-[var(--muted)] cursor-grab active:cursor-grabbing"
        aria-label="Drag task"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text)] truncate">{task.title}</p>
        {(task.assignee || task.age) && (
          <p className="text-[10px] text-[var(--muted)] mt-0.5">
            {task.assignee && <span>{task.assignee}</span>}
            {task.assignee && task.age && <span> · </span>}
            {task.age && <span>{task.age}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Column ──

function KanbanColumnView({
  column,
  tasks,
  onCreateTask,
  onTaskClick,
}: {
  column: KanbanColumn;
  tasks: KanbanTask[];
  onCreateTask: (status: string) => void;
  onTaskClick: (task: KanbanTask) => void;
}) {
  return (
    <div className="flex flex-col min-w-[220px] w-[220px] bg-[var(--bg)] rounded-lg border border-[var(--border)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <h3 className="text-xs font-semibold text-[var(--text)]">
          {column.label}
          <span className="ml-1.5 text-[var(--muted)] font-normal">{tasks.length}</span>
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-[var(--muted)]"
          onClick={() => onCreateTask(column.id)}
          aria-label={`Add task to ${column.label}`}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px] max-h-[60vh]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
          {tasks.length === 0 && (
            <p className="text-[10px] text-[var(--muted)] text-center py-4">No tasks</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Task Modal ──

function TaskModal({
  task,
  status,
  onClose,
  onSave,
}: {
  task?: KanbanTask;
  status: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    body?: string;
    status: string;
    priority?: string;
    assignee?: string;
  }) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [body, setBody] = useState(task?.body ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "normal");
  const [assignee, setAssignee] = useState(task?.assignee ?? "");

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
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-96 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {task ? "Edit Task" : "New Task"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="task-title"
              className="block text-xs font-medium text-[var(--text)] mb-1"
            >
              Title
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>
          <div>
            <label
              htmlFor="task-body"
              className="block text-xs font-medium text-[var(--text)] mb-1"
            >
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
              <label
                htmlFor="task-priority"
                className="block text-xs font-medium text-[var(--text)] mb-1"
              >
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
              <label
                htmlFor="task-assignee"
                className="block text-xs font-medium text-[var(--text)] mb-1"
              >
                Assignee
              </label>
              <input
                id="task-assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {task ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Board ──

export function KanbanBoard() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState("triage");
  const [editingTask, setEditingTask] = useState<KanbanTask | undefined>();

  const { data: boardData, mutate } = useSWR<{ tasks: KanbanTask[] }>("/kanban/board", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000,
  });

  const tasks = useMemo(() => boardData?.tasks ?? [], [boardData]);

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.body?.toLowerCase().includes(q),
    );
  }, [tasks, search]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, KanbanTask[]> = {};
    for (const col of COLUMNS) map[col.id] = [];
    for (const t of filtered) {
      const status = map[t.status] ? t.status : "triage";
      map[status]?.push(t);
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

      // Determine target column
      let targetStatus: string | undefined;
      for (const col of COLUMNS) {
        if (tasksByStatus[col.id]?.some((t) => t.id === over.id)) {
          targetStatus = col.id;
          break;
        }
      }
      // If dropped on column area directly
      if (!targetStatus) {
        for (const col of COLUMNS) {
          if (over.id === col.id) {
            targetStatus = col.id;
            break;
          }
        }
      }

      if (!targetStatus || targetStatus === task.status) return;

      // Optimistic update
      const optimistic = tasks.map((t) => (t.id === taskId ? { ...t, status: targetStatus! } : t));
      void mutate({ tasks: optimistic }, false);

      try {
        if (targetStatus === "done") {
          await apiPost(`/kanban/tasks/${taskId}`, { status: targetStatus } as unknown as Record<
            string,
            unknown
          >);
        } else {
          await apiPost(`/kanban/tasks/${taskId}/patch`, {
            status: targetStatus,
          } as unknown as Record<string, unknown>);
        }
        void mutate();
      } catch {
        void mutate();
      }
    },
    [tasks, tasksByStatus, mutate],
  );

  const handleCreateTask = useCallback((status: string) => {
    setModalStatus(status);
    setEditingTask(undefined);
    setShowModal(true);
  }, []);

  const handleTaskClick = useCallback((task: KanbanTask) => {
    setEditingTask(task);
    setModalStatus(task.status);
    setShowModal(true);
  }, []);

  const handleSaveTask = useCallback(
    async (data: {
      title: string;
      body?: string;
      status: string;
      priority?: string;
      assignee?: string;
    }) => {
      if (editingTask) {
        await apiPost(
          `/kanban/tasks/${editingTask.id}/patch`,
          data as unknown as Record<string, unknown>,
        );
      } else {
        await apiPost("/kanban/tasks", data as unknown as Record<string, unknown>);
      }
      void mutate();
    },
    [editingTask, mutate],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await apiPost(`/kanban/tasks/${taskId}/patch`, { status: "archived" } as unknown as Record<
        string,
        unknown
      >);
      void mutate();
      setShowModal(false);
    },
    [mutate],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)]">Kanban</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="text-xs rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] w-40"
          />
          <Button variant="outline" size="sm" onClick={() => handleCreateTask("triage")}>
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => (
              <KanbanColumnView
                key={col.id}
                column={col}
                tasks={tasksByStatus[col.id] ?? []}
                onCreateTask={handleCreateTask}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {showModal && (
        <TaskModal
          task={editingTask}
          status={modalStatus}
          onClose={() => setShowModal(false)}
          onSave={handleSaveTask}
        />
      )}

      {editingTask && showModal && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleDeleteTask(editingTask.id)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Archive
          </Button>
        </div>
      )}
    </div>
  );
}
