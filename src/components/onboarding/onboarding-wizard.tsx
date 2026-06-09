"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

const STEPS = [
  { title: "Provider Setup", description: "Configure your AI provider" },
  { title: "Model Selection", description: "Choose a default model" },
  { title: "Workspace", description: "Set your workspace directory" },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const current = STEPS[step];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] p-8">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-[var(--text)]">{current.title}</h2>
          <p className="text-sm text-[var(--muted)]">{current.description}</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === step ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
