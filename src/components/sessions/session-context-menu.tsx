'use client';

import type { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Session } from '@/types';
import { Pencil, Pin, PinOff, Archive, ArchiveRestore, Trash2 } from 'lucide-react';

interface SessionContextMenuProps {
  session: Session;
  onRename: (sessionId: string) => void;
  onPin: (sessionId: string) => void;
  onArchive: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  children: ReactNode;
}

export function SessionContextMenu({
  session,
  onRename,
  onPin,
  onArchive,
  onDelete,
  children,
}: SessionContextMenuProps) {
  const handleDelete = () => {
    if (window.confirm(`Delete "${session.title || 'New Chat'}"?`)) {
      onDelete(session.session_id);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onRename(session.session_id)}>
          <Pencil className="size-4" />
          Rename
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onPin(session.session_id)}>
          {session.pinned ? (
            <>
              <PinOff className="size-4" />
              Unpin
            </>
          ) : (
            <>
              <Pin className="size-4" />
              Pin
            </>
          )}
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onArchive(session.session_id)}>
          {session.archived ? (
            <>
              <ArchiveRestore className="size-4" />
              Unarchive
            </>
          ) : (
            <>
              <Archive className="size-4" />
              Archive
            </>
          )}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
