import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionList } from "@/components/sessions/session-list";
import { bucketSessionsByDate } from "@/lib/date-buckets";
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
      <SessionList sessions={sessions} projects={[]} activeSessionId={null} onSelect={() => {}} />,
    );
    expect(screen.getByText("Chat about Python")).toBeDefined();
    expect(screen.getByText("React discussion")).toBeDefined();
  });

  it("highlights active session", () => {
    const sessions = [makeSession({ id: "s1", title: "Active" })];
    render(
      <SessionList sessions={sessions} projects={[]} activeSessionId="s1" onSelect={() => {}} />,
    );
    const item = screen.getByText("Active").closest("button");
    expect(item?.className).toContain("active");
  });

  it("calls onSelect when session clicked", () => {
    const onSelect = vi.fn();
    const sessions = [makeSession({ id: "s1", title: "Click me" })];
    render(
      <SessionList sessions={sessions} projects={[]} activeSessionId={null} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("shows empty state when no sessions", () => {
    render(<SessionList sessions={[]} projects={[]} activeSessionId={null} onSelect={() => {}} />);
    expect(screen.getByText(/no sessions/i)).toBeDefined();
  });
});

describe("Date group headers from bucketSessionsByDate", () => {
  const nowMs = new Date("2026-06-09T12:00:00Z").getTime();

  it("produces expected date group labels for display", () => {
    const sessions: Session[] = [
      makeSession({
        id: "today",
        updated_at: new Date(nowMs - 60000).toISOString(),
      }),
      makeSession({
        id: "yesterday",
        updated_at: new Date(nowMs - 86400000).toISOString(),
      }),
      makeSession({
        id: "older",
        updated_at: new Date(nowMs - 30 * 86400000).toISOString(),
      }),
    ];

    const buckets = bucketSessionsByDate(sessions, nowMs);
    const labels = buckets.map((b) => b.label);

    expect(labels).toContain("Today");
    expect(labels).toContain("Yesterday");
    expect(labels).toContain("Older");
  });

  it("assigns sessions to correct date buckets", () => {
    const sessions: Session[] = [
      makeSession({
        id: "today-session",
        updated_at: new Date(nowMs - 60000).toISOString(),
      }),
      makeSession({
        id: "yesterday-session",
        updated_at: new Date(nowMs - 86400000).toISOString(),
      }),
    ];

    const buckets = bucketSessionsByDate(sessions, nowMs);
    const todayBucket = buckets.find((b) => b.label === "Today");
    const yesterdayBucket = buckets.find((b) => b.label === "Yesterday");

    expect(todayBucket!.sessions[0].id).toBe("today-session");
    expect(yesterdayBucket!.sessions[0].id).toBe("yesterday-session");
  });
});
