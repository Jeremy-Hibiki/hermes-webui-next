import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCron } from "@/hooks/use-cron";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("useCron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches cron jobs", async () => {
    const jobs = [
      { id: "c1", name: "Daily summary", schedule: "0 9 * * *", enabled: true },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(jobs),
    });

    const { result } = renderHook(() => useCron());

    await act(async () => {
      await result.current.fetchJobs();
    });

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
      expect(result.current.jobs[0].name).toBe("Daily summary");
    });
  });

  it("creates a cron job", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "c2", name: "New job" }),
    });

    const { result } = renderHook(() => useCron());

    await act(async () => {
      await result.current.createJob({
        name: "New job",
        schedule: "0 * * * *",
        prompt: "test",
        session_id: "s1",
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/crons/create",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("New job"),
      })
    );
  });

  it("deletes a cron job", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const { result } = renderHook(() => useCron());

    await act(async () => {
      await result.current.deleteJob("c1");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/crons/delete",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("c1"),
      })
    );
  });

  it("toggles a cron job", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const { result } = renderHook(() => useCron());

    await act(async () => {
      await result.current.toggleJob("c1", false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/crons/toggle",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("c1"),
      })
    );
  });
});
