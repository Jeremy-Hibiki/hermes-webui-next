import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

vi.mock("swr", () => ({
  __esModule: true,
  default: () => ({
    data: {
      completed: false,
      system: { agent_ok: true, provider_ok: false, password_ok: false },
      setup: [
        {
          id: "openrouter",
          name: "OpenRouter",
          category: "easy",
          default_model: "openrouter/auto",
        },
        {
          id: "ollama",
          name: "Ollama",
          category: "self-hosted",
          default_base_url: "http://localhost:11434",
        },
      ],
      workspaces: ["/home/user/projects"],
      models: [{ id: "openrouter/auto", name: "Auto", provider: "openrouter" }],
    },
  }),
}));

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders wizard with step indicators", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    const dots = screen.getByRole("navigation", {
      name: "Wizard progress",
    });
    expect(dots).toBeTruthy();
    expect(screen.getByText("System Check")).toBeTruthy();
  });

  it("shows step title and description", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    expect(screen.getByText("System Check")).toBeTruthy();
    expect(screen.getByText("Verify your system is ready")).toBeTruthy();
  });

  it("continue button navigates to next step", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    const continueBtn = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueBtn);
    expect(screen.getByText("Provider Setup")).toBeTruthy();
  });

  it("back button navigates to previous step", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    const continueBtn = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueBtn);
    expect(screen.getByText("Provider Setup")).toBeTruthy();
    const backBtn = screen.getByRole("button", { name: "Go to previous step" });
    fireEvent.click(backBtn);
    expect(screen.getByText("System Check")).toBeTruthy();
  });

  it("skip button calls onComplete", async () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);
    const skipBtn = screen.getByRole("button", { name: "Skip onboarding" });
    fireEvent.click(skipBtn);
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("shows Open Hermes button on last step", async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    const continueBtn = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueBtn);
    expect(screen.getByText("Provider Setup")).toBeTruthy();
  });
});
