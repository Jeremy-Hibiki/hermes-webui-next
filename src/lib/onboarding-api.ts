import { fetcher, apiPost } from "./api-client";
import type {
  OnboardingStatus,
  OnboardingSetupBody,
  OnboardingProbeResponse,
  OnboardingOAuthStartResponse,
  OnboardingOAuthPollResponse,
} from "@/types/api";

export const onboardingApi = {
  getStatus: () => fetcher<OnboardingStatus>("/onboarding/status"),

  setup: (body: OnboardingSetupBody) =>
    apiPost("/onboarding/setup", body as unknown as Record<string, unknown>),

  complete: () => apiPost("/onboarding/complete"),

  probe: (body: { base_url: string; api_key?: string }) =>
    apiPost<OnboardingProbeResponse>(
      "/onboarding/probe",
      body as unknown as Record<string, unknown>,
    ),

  startOAuth: (provider: string) =>
    apiPost<OnboardingOAuthStartResponse>("/onboarding/oauth/start", {
      provider,
    }),

  pollOAuth: (flowId: string) =>
    fetcher<OnboardingOAuthPollResponse>(`/onboarding/oauth/poll?flow_id=${flowId}`),

  cancelOAuth: (flowId: string, provider: string) =>
    apiPost("/onboarding/oauth/cancel", { flow_id: flowId, provider }),
};
