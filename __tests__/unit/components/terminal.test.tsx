import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalPanel } from "@/components/terminal/terminal";

describe("TerminalPanel", () => {
  it("renders terminal container", () => {
    render(<TerminalPanel sessionId="s1" />);
    expect(screen.getByTestId("terminal-container")).toBeTruthy();
  });

  it("shows session id", () => {
    render(<TerminalPanel sessionId="s1" />);
    expect(screen.getByText(/s1/i)).toBeTruthy();
  });
});
