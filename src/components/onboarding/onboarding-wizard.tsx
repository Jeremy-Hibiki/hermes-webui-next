"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import {
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Loader2,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { onboardingApi } from "@/lib/onboarding-api";
import type { OnboardingStatus, OnboardingProvider, OnboardingModel } from "@/types/api";

const STEPS = [
  { title: "System Check", description: "Verify your system is ready" },
  { title: "Provider Setup", description: "Configure your AI provider" },
  {
    title: "Workspace & Model",
    description: "Choose your workspace and model",
  },
  { title: "Password", description: "Set an admin password (optional)" },
  { title: "Finish", description: "Review your configuration" },
];

const SELF_HOSTED_IDS = new Set(["ollama", "lm-studio", "custom"]);

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { data: status } = useSWR<OnboardingStatus>("/onboarding/status", () =>
    onboardingApi.getStatus(),
  );
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [probeResult, setProbeResult] = useState<OnboardingModel[]>([]);
  const [probeError, setProbeError] = useState("");
  const [probing, setProbing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from current config
  useEffect(() => {
    if (!status) return;
    if (status.completed) {
      onComplete();
      return;
    }
    if (status.settings?.provider && !provider) setProvider(status.settings.provider);
    if (status.settings?.model && !model) setModel(status.settings.model);
    if (status.settings?.base_url && !baseUrl) setBaseUrl(status.settings.base_url);
    if (status.workspaces?.length && !workspace) setWorkspace(status.workspaces[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const selectedProvider = status?.setup?.find((p: OnboardingProvider) => p.id === provider);

  const probeConnection = useCallback(async () => {
    if (!baseUrl) return;
    setProbing(true);
    setProbeError("");
    try {
      const result = await onboardingApi.probe({
        base_url: baseUrl,
        api_key: apiKey || undefined,
      });
      if (result.ok) {
        setProbeResult(result.models ?? []);
        setProbeError("");
      } else {
        setProbeResult([]);
        setProbeError(result.error ?? "Connection failed");
      }
    } catch {
      setProbeResult([]);
      setProbeError("Connection failed");
    } finally {
      setProbing(false);
    }
  }, [baseUrl, apiKey]);

  const handleProviderChange = (id: string) => {
    setProvider(id);
    setProbeResult([]);
    setProbeError("");
    const prov = status?.setup?.find((p: OnboardingProvider) => p.id === id);
    if (prov?.default_base_url) {
      setBaseUrl(prov.default_base_url);
    } else if (!SELF_HOSTED_IDS.has(id)) {
      setBaseUrl("");
    }
    if (prov?.default_model) {
      setModel(prov.default_model);
    } else {
      setModel("");
    }
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!provider) return "Please select a provider";
      if (SELF_HOSTED_IDS.has(provider) && !baseUrl)
        return "Base URL is required for self-hosted providers";
      if (SELF_HOSTED_IDS.has(provider) && !probeResult.length && !probing)
        return "Please test your connection first";
    }
    if (step === 2) {
      if (!workspace.trim()) return "Please enter a workspace path";
      if (!model.trim()) return "Please select or enter a model";
    }
    if (step === 3) {
      if (password && password !== confirmPassword) return "Passwords do not match";
    }
    return null;
  };

  const handleNext = async () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    try {
      await onboardingApi.setup({
        provider,
        model: model || undefined,
        api_key: apiKey || undefined,
        base_url: baseUrl || undefined,
        password: password || undefined,
      });
      // Register workspace if not in known list
      if (workspace && status?.workspaces && !status.workspaces.includes(workspace)) {
        try {
          await fetch("/api/workspaces/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ path: workspace }),
          });
        } catch {
          // Non-critical
        }
      }
      await onboardingApi.complete();
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = async () => {
    try {
      await onboardingApi.complete();
    } catch {
      // Already completed
    }
    onComplete();
  };

  const providersByCategory = () => {
    const cats: Record<string, OnboardingProvider[]> = {};
    for (const p of status?.setup ?? []) {
      const cat = p.category ?? "specialized";
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(p);
    }
    return cats;
  };

  const categoryLabels: Record<string, string> = {
    easy: "Easy Start",
    "self-hosted": "Self-Hosted",
    specialized: "Specialized",
  };

  const allModels = [...(status?.models ?? []), ...probeResult];
  const uniqueModels = allModels.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  const current = STEPS[step];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] p-8">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-[var(--text)]">{current.title}</h2>
          <p className="text-sm text-[var(--muted)]">{current.description}</p>
        </div>

        <nav className="flex items-center justify-center gap-2" aria-label="Wizard progress">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step
                  ? "bg-[var(--accent)]"
                  : i < step
                    ? "bg-[var(--accent)] opacity-60"
                    : "bg-[var(--border)]"
              }`}
              aria-current={i === step ? "step" : undefined}
            />
          ))}
        </nav>

        <div className="min-h-[200px]">
          {step === 0 && <StepSystemCheck status={status} />}
          {step === 1 && (
            <StepProviderSetup
              providers={providersByCategory()}
              categoryLabels={categoryLabels}
              provider={provider}
              apiKey={apiKey}
              baseUrl={baseUrl}
              probing={probing}
              probeResult={probeResult}
              probeError={probeError}
              isSelfHosted={SELF_HOSTED_IDS.has(provider)}
              onProviderChange={handleProviderChange}
              onApiKeyChange={setApiKey}
              onBaseUrlChange={setBaseUrl}
              onProbe={probeConnection}
            />
          )}
          {step === 2 && (
            <StepWorkspaceModel
              workspaces={status?.workspaces ?? []}
              workspace={workspace}
              model={model}
              models={uniqueModels}
              onWorkspaceChange={setWorkspace}
              onModelChange={setModel}
            />
          )}
          {step === 3 && (
            <StepPassword
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              passwordSet={status?.system?.password_ok ?? false}
            />
          )}
          {step === 4 && (
            <StepFinish
              provider={selectedProvider?.name ?? provider}
              model={model}
              workspace={workspace}
              passwordSet={status?.system?.password_ok ?? false}
              passwordEntered={!!password}
            />
          )}
        </div>

        {error && (
          <p className="text-sm text-[var(--error)]" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack} aria-label="Go to previous step">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            {step < STEPS.length - 1 && (
              <Button variant="ghost" onClick={handleSkip} aria-label="Skip onboarding">
                <SkipForward className="w-4 h-4" />
                Skip
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            disabled={submitting}
            aria-label={step === STEPS.length - 1 ? "Open Hermes" : "Continue"}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step === STEPS.length - 1 ? (
              "Open Hermes"
            ) : (
              "Continue"
            )}
            {!submitting && step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, ok, detail }: { label: string; ok?: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      {ok ? (
        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        <p className="text-xs text-[var(--muted)]">{detail}</p>
      </div>
    </div>
  );
}

function StepSystemCheck({ status }: { status?: OnboardingStatus }) {
  return (
    <div className="space-y-3">
      <StatusCard
        label="Agent Status"
        ok={status?.system?.agent_ok}
        detail={
          status?.system?.agent_ok ? "Agent is running and ready" : "Waiting for agent to start"
        }
      />
      <StatusCard
        label="Provider Config"
        ok={status?.system?.provider_ok}
        detail={
          status?.system?.provider_ok ? "Provider is configured" : "No provider configured yet"
        }
      />
      <StatusCard
        label="Password"
        ok={status?.system?.password_ok}
        detail={
          status?.system?.password_ok ? "Admin password is set" : "No admin password set (optional)"
        }
      />
    </div>
  );
}

function StepProviderSetup({
  providers,
  categoryLabels,
  provider,
  apiKey,
  baseUrl,
  probing,
  probeError,
  probeResult,
  isSelfHosted,
  onProviderChange,
  onApiKeyChange,
  onBaseUrlChange,
  onProbe,
}: {
  providers: Record<string, OnboardingProvider[]>;
  categoryLabels: Record<string, string>;
  provider: string;
  apiKey: string;
  baseUrl: string;
  probing: boolean;
  probeResult: OnboardingModel[];
  probeError: string;
  isSelfHosted: boolean;
  onProviderChange: (id: string) => void;
  onApiKeyChange: (v: string) => void;
  onBaseUrlChange: (v: string) => void;
  onProbe: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="provider-select"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Provider
        </label>
        <select
          id="provider-select"
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
          aria-label="Select provider"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          <option value="">Select a provider...</option>
          {Object.entries(providers).map(([cat, items]) => (
            <optgroup key={cat} label={categoryLabels[cat] ?? cat}>
              {items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="api-key-input"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          API Key
        </label>
        <input
          id="api-key-input"
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter your API key"
          aria-label="API key"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
      </div>

      {(isSelfHosted || baseUrl) && (
        <div>
          <label
            htmlFor="base-url-input"
            className="block text-sm font-medium text-[var(--text)] mb-1"
          >
            Base URL
          </label>
          <div className="flex gap-2">
            <input
              id="base-url-input"
              type="url"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="http://localhost:11434"
              aria-label="Base URL"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
            <Button
              variant="outline"
              onClick={onProbe}
              disabled={probing || !baseUrl}
              aria-label="Test connection"
            >
              {probing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              Test
            </Button>
          </div>
        </div>
      )}

      {probeError && (
        <p className="text-sm text-[var(--error)]" role="alert">
          {probeError}
        </p>
      )}
      {probeResult.length > 0 && (
        <p className="text-sm text-green-600">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Connection successful - {probeResult.length} model
          {probeResult.length !== 1 ? "s" : ""} found
        </p>
      )}
    </div>
  );
}

function StepWorkspaceModel({
  workspaces,
  workspace,
  model,
  models,
  onWorkspaceChange,
  onModelChange,
}: {
  workspaces: string[];
  workspace: string;
  model: string;
  models: OnboardingModel[];
  onWorkspaceChange: (v: string) => void;
  onModelChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="workspace-select"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Workspace
        </label>
        {workspaces.length > 0 ? (
          <select
            id="workspace-select"
            value={workspace}
            onChange={(e) => onWorkspaceChange(e.target.value)}
            aria-label="Select workspace"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            <option value="">Select a workspace...</option>
            {workspaces.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
            <option value="__custom__">Custom path...</option>
          </select>
        ) : (
          <input
            id="workspace-input"
            type="text"
            value={workspace}
            onChange={(e) => onWorkspaceChange(e.target.value)}
            placeholder="/path/to/your/workspace"
            aria-label="Workspace path"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        )}
        {workspace === "__custom__" && (
          <input
            type="text"
            onChange={(e) => onWorkspaceChange(e.target.value)}
            placeholder="/path/to/your/workspace"
            aria-label="Custom workspace path"
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        )}
      </div>

      <div>
        <label htmlFor="model-select" className="block text-sm font-medium text-[var(--text)] mb-1">
          Model
        </label>
        {models.length > 0 ? (
          <select
            id="model-select"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            aria-label="Select model"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            <option value="">Select a model...</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="__custom__">Custom model...</option>
          </select>
        ) : (
          <input
            id="model-input"
            type="text"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="e.g. gpt-4o, claude-sonnet-4-6"
            aria-label="Model name"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        )}
        {model === "__custom__" && (
          <input
            type="text"
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="e.g. gpt-4o, claude-sonnet-4-6"
            aria-label="Custom model name"
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        )}
      </div>
    </div>
  );
}

function StepPassword({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  passwordSet,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  passwordSet: boolean;
}) {
  return (
    <div className="space-y-4">
      {passwordSet && (
        <p className="text-sm text-[var(--muted)]">
          An admin password is already set. You can change it or leave blank to keep the current
          one.
        </p>
      )}
      <div>
        <label
          htmlFor="password-input"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Password
        </label>
        <input
          id="password-input"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Enter admin password"
          aria-label="Admin password"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
      </div>
      {password && (
        <div>
          <label
            htmlFor="confirm-password-input"
            className="block text-sm font-medium text-[var(--text)] mb-1"
          >
            Confirm Password
          </label>
          <input
            id="confirm-password-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Confirm admin password"
            aria-label="Confirm admin password"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </div>
      )}
    </div>
  );
}

function StepFinish({
  provider,
  model,
  workspace,
  passwordSet,
  passwordEntered,
}: {
  provider: string;
  model: string;
  workspace: string;
  passwordSet: boolean;
  passwordEntered: boolean;
}) {
  const rows = [
    { label: "Provider", value: provider || "Not set" },
    { label: "Model", value: model || "Not set" },
    { label: "Workspace", value: workspace || "Not set" },
    {
      label: "Password",
      value: passwordEntered ? "Will be updated" : passwordSet ? "Set" : "Not set",
    },
  ];

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
        >
          <span className="text-sm text-[var(--muted)]">{r.label}</span>
          <span className="text-sm font-medium text-[var(--text)]">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
