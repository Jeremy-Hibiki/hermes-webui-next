import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionList } from "@/components/sessions/session-list";
import type { Session } from "@/types";

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: "s1",
  title: "Test Chat",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  messages: [],
  model: null,
  provider: null,
  workspace: null,
  profile: "default",
  pinned: false,
  archived: false,
  project_id: null,
  message_count: 0,
  ...overrides,
});

describe("SessionList", () => {
  it("renders sessions with titles", () => {
    const sessions = [
      makeSession({ id: "s1", title: "Chat about Python" }),
      makeSession({ id: "s2", title: "React discussion" }),
    ];
    render(
      <SessionList
        sessions={sessions}
        projects={[]}
        activeSessionId={null}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText("Chat about Python")).toBeDefined();
    expect(screen.getByText("React discussion")).toBeDefined();
  });

  it("highlights active session", () => {
    const sessions = [makeSession({ id: "s1", title: "Active" })];
    render(
      <SessionList
        sessions={sessions}
        projects={[]}
        activeSessionId="s1"
        onSelect={() => {}}
      />
    );
    const item = screen.getByText("Active").closest("button");
    expect(item?.className).toContain("active");
  });

  it("calls onSelect when session clicked", () => {
    const onSelect = vi.fn();
    const sessions = [makeSession({ id: "s1", title: "Click me" })];
    render(
      <SessionList
        sessions={sessions}
        projects={[]}
        activeSessionId={null}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("shows empty state when no sessions", () => {
    render(
      <SessionList
        sessions={[]}
        projects={[]}
        activeSessionId={null}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText(/no sessions/i)).toBeDefined();
  });
});
