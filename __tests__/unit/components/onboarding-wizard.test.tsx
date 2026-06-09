import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

describe("OnboardingWizard", () => {
  it("renders first step", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    expect(screen.getByText("Provider Setup")).toBeTruthy();
  });

  it("has next button", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    expect(screen.getByText(/next/i)).toBeTruthy();
  });

  it("calls onComplete when finishing all steps", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);
    // Skip through all steps quickly by clicking next
    const nextBtn = screen.getByText(/next/i);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    expect(onComplete).toHaveBeenCalled();
  });
});
