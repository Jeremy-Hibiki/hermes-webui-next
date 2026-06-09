import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetcher, apiPost, apiDelete } from "@/lib/api-client";

describe("api-client", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("fetcher makes GET and returns JSON", async () => {
    const data = { sessions: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve(data),
    } as Response);
    const result = await fetcher("/sessions");
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/sessions",
      expect.objectContaining({ headers: expect.objectContaining({ "Content-Type": "application/json" }) })
    );
  });

  it("fetcher throws on non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false, status: 404,
    } as Response);
    await expect(fetcher("/bad")).rejects.toThrow("API Error: 404");
  });

  it("apiPost sends POST with JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve({ stream_id: "x" }),
    } as Response);
    const r = await apiPost("/chat/start", { message: "hi" });
    expect(r).toEqual({ stream_id: "x" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/chat/start",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ message: "hi" }) })
    );
  });

  it("apiDelete sends DELETE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve({ ok: true }),
    } as Response);
    await apiDelete("/session/delete", { session_id: "s1" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/session/delete",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
