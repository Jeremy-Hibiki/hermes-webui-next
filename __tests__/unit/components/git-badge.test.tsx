import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GitBadge } from "@/components/workspace/git-badge";
import type { GitStatus } from "@/types";

const mockStatus: GitStatus = {
  branch: "main",
  staged: ["src/app.ts"],
  unstaged: ["README.md"],
  untracked: ["new.txt"],
  ahead: 2,
  behind: 0,
};

describe("GitBadge", () => {
  it("renders branch name", () => {
    render(<GitBadge status={mockStatus} />);
    expect(screen.getByText("main")).toBeTruthy();
  });

  it("shows staged count", () => {
    render(<GitBadge status={mockStatus} />);
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("shows ahead indicator when ahead > 0", () => {
    render(<GitBadge status={mockStatus} />);
    expect(screen.getByText("↑2")).toBeTruthy();
  });

  it("renders nothing when status is null", () => {
    const { container } = render(<GitBadge status={null} />);
    expect(container.innerHTML).toBe("");
  });
});
