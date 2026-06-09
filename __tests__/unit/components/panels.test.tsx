import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlCenter } from "@/components/panels/control-center";
import { CronPanel } from "@/components/panels/cron-panel";
import { SkillsPanel } from "@/components/panels/skills-panel";
import { MemoryPanel } from "@/components/panels/memory-panel";
import { TodoPanel } from "@/components/panels/todo-panel";
import { SettingsPanel } from "@/components/panels/settings-panel";
import { ProfilePanel } from "@/components/panels/profile-panel";
import { InsightsPanel } from "@/components/panels/insights-panel";
import { KanbanBoard } from "@/components/panels/kanban-board";

describe("ControlCenter", () => {
  it("renders launcher button", () => {
    render(<ControlCenter />);
    expect(screen.getByLabelText(/control center/i)).toBeTruthy();
  });

  it("opens panel menu on click", () => {
    render(<ControlCenter />);
    fireEvent.click(screen.getByLabelText(/control center/i));
    expect(screen.getByText(/cron/i)).toBeTruthy();
    expect(screen.getByText(/skills/i)).toBeTruthy();
  });
});

describe("CronPanel", () => {
  it("renders cron panel header", () => {
    render(<CronPanel />);
    expect(screen.getAllByText(/cron/i).length).toBeGreaterThan(0);
  });
});

describe("SkillsPanel", () => {
  it("renders skills panel header", () => {
    render(<SkillsPanel />);
    expect(screen.getAllByText(/skills/i).length).toBeGreaterThan(0);
  });
});

describe("MemoryPanel", () => {
  it("renders memory panel header", () => {
    render(<MemoryPanel />);
    expect(screen.getAllByText(/memory/i).length).toBeGreaterThan(0);
  });
});

describe("TodoPanel", () => {
  it("renders todo panel header", () => {
    render(<TodoPanel />);
    expect(screen.getAllByText(/todo/i).length).toBeGreaterThan(0);
  });
});

describe("SettingsPanel", () => {
  it("renders settings panel header", () => {
    render(<SettingsPanel />);
    expect(screen.getAllByText(/settings/i).length).toBeGreaterThan(0);
  });
});

describe("ProfilePanel", () => {
  it("renders profile panel header", () => {
    render(<ProfilePanel />);
    expect(screen.getAllByText(/profiles/i).length).toBeGreaterThan(0);
  });
});

describe("InsightsPanel", () => {
  it("renders insights panel header", () => {
    render(<InsightsPanel />);
    expect(screen.getAllByText(/insights/i).length).toBeGreaterThan(0);
  });
});

describe("KanbanBoard", () => {
  it("renders kanban board header", () => {
    render(<KanbanBoard />);
    expect(screen.getAllByText(/kanban/i).length).toBeGreaterThan(0);
  });
});
