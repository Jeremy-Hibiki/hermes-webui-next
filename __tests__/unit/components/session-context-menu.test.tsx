import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionItem } from "@/components/sessions/session-item";
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

describe("SessionItem with context menu", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  const handlers = {
    onSelect: vi.fn(),
    onRename: vi.fn(),
    onPin: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    handlers.onSelect.mockClear();
    handlers.onRename.mockClear();
    handlers.onPin.mockClear();
    handlers.onArchive.mockClear();
    handlers.onDelete.mockClear();
  });

  it("shows Rename in context menu", async () => {
    render(<SessionItem session={makeSession()} isActive={false} {...handlers} />);
    const trigger = screen.getByText("Test Chat");
    fireEvent.contextMenu(trigger);
    expect(await screen.findByText("Rename")).toBeDefined();
  });

  it("shows Pin when session is not pinned", async () => {
    render(<SessionItem session={makeSession({ pinned: false })} isActive={false} {...handlers} />);
    const trigger = screen.getByText("Test Chat");
    fireEvent.contextMenu(trigger);
    expect(await screen.findByText("Pin")).toBeDefined();
  });

  it("shows Unpin when session is pinned", async () => {
    render(<SessionItem session={makeSession({ pinned: true })} isActive={false} {...handlers} />);
    const trigger = screen.getByText("Test Chat");
    fireEvent.contextMenu(trigger);
    expect(await screen.findByText("Unpin")).toBeDefined();
  });

  it("shows Archive when session is not archived", async () => {
    render(
      <SessionItem session={makeSession({ archived: false })} isActive={false} {...handlers} />,
    );
    const trigger = screen.getByText("Test Chat");
    fireEvent.contextMenu(trigger);
    expect(await screen.findByText("Archive")).toBeDefined();
  });

  it("shows Unarchive when session is archived", async () => {
    render(
      <SessionItem session={makeSession({ archived: true })} isActive={false} {...handlers} />,
    );
    const trigger = screen.getByText("Test Chat");
    fireEvent.contextMenu(trigger);
    expect(await screen.findByText("Unarchive")).toBeDefined();
  });

  it("shows Delete in context menu", async () => {
    render(<SessionItem session={makeSession()} isActive={false} {...handlers} />);
    const trigger = screen.getByText("Test Chat");
    fireEvent.contextMenu(trigger);
    expect(await screen.findByText("Delete")).toBeDefined();
  });

  it("enters rename mode when Rename is clicked", async () => {
    render(<SessionItem session={makeSession()} isActive={false} {...handlers} />);
    const trigger = screen.getByText("Test Chat");
    fireEvent.contextMenu(trigger);

    const renameItem = await screen.findByRole("menuitem", { name: /rename/i });
    fireEvent.click(renameItem);

    // After clicking Rename, an input should appear
    const input = await screen.findByDisplayValue("Test Chat");
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(handlers.onRename).toHaveBeenCalledWith("s1", "New Title");
    });
  });

  it("cancels rename on Escape", async () => {
    render(<SessionItem session={makeSession()} isActive={false} {...handlers} />);
    const trigger = screen.getByText("Test Chat");
    fireEvent.contextMenu(trigger);

    const renameItem = await screen.findByRole("menuitem", { name: /rename/i });
    fireEvent.click(renameItem);

    const input = await screen.findByDisplayValue("Test Chat");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(handlers.onRename).not.toHaveBeenCalled();
  });

  it("renders simple button when no action handlers provided", () => {
    render(<SessionItem session={makeSession()} isActive={false} onSelect={handlers.onSelect} />);
    expect(screen.getByText("Test Chat")).toBeDefined();
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("renders three-dot button for items with actions", () => {
    render(<SessionItem session={makeSession()} isActive={false} {...handlers} />);
    expect(screen.getByLabelText("Session actions")).toBeDefined();
  });
});
