import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { render, screen, act } from "@testing-library/react";
import { TerminalPanel } from "@/components/terminal/terminal";

// Mock dynamic imports — terminal uses dynamic import() for xterm
vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    fit: vi.fn(),
    loadAddon: vi.fn(),
    onData: vi.fn(),
    dispose: vi.fn(),
    cols: 80,
    rows: 24,
    buffer: { active: { length: 0 } },
    write: vi.fn(),
    options: {},
  })),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    proposeDimensions: vi.fn(() => ({ cols: 80, rows: 24 })),
  })),
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({})),
}));

// Mock EventSource
const mockEventSource = {
  addEventListener: vi.fn(),
  close: vi.fn(),
};
vi.stubGlobal(
  "EventSource",
  vi.fn(function (this: EventSource, _url: string) {
    return mockEventSource;
  }),
);

// Mock fetch for terminal start/resize/close
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    status: 200,
  }),
);

describe("TerminalPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders terminal container", () => {
    render(<TerminalPanel sessionId="s1" />);
    expect(screen.getByTestId("terminal-container")).toBeTruthy();
  });

  it("shows terminal header with label", () => {
    render(<TerminalPanel sessionId="s1" />);
    expect(screen.getByText("Terminal")).toBeTruthy();
  });

  it("has action buttons", () => {
    render(<TerminalPanel sessionId="s1" />);
    expect(screen.getByLabelText("Copy terminal content")).toBeTruthy();
    expect(screen.getByLabelText("Restart terminal")).toBeTruthy();
    expect(screen.getByLabelText("Collapse terminal")).toBeTruthy();
    expect(screen.getByLabelText("Close terminal")).toBeTruthy();
  });

  it("renders with different session IDs", () => {
    render(<TerminalPanel sessionId="abc-123" />);
    expect(screen.getByTestId("terminal-container")).toBeTruthy();
  });

  it("collapses when collapse button is clicked", () => {
    render(<TerminalPanel sessionId="s1" />);
    const collapseBtn = screen.getByLabelText("Collapse terminal");
    act(() => collapseBtn.click());
    expect(screen.queryByTestId("terminal-container")).toBeNull();
  });
});
