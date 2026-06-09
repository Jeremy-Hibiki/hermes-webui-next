import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock webkitSpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

describe("useVoice", () => {
  it("starts recording and provides transcript", async () => {
    const mockSR = new MockSpeechRecognition();
    const OrigSR = (globalThis as Record<string, unknown>).webkitSpeechRecognition;
    (globalThis as Record<string, unknown>).webkitSpeechRecognition = function () { return mockSR; };
    (globalThis as Record<string, unknown>).SpeechRecognition = function () { return mockSR; };

    const { useVoice } = await import("@/hooks/use-voice");
    const { result } = renderHook(() => useVoice());

    expect(result.current.recording).toBe(false);

    act(() => {
      result.current.startRecording();
    });
    expect(result.current.recording).toBe(true);

    // Simulate result
    act(() => {
      mockSR.onresult!({
        results: [[{ transcript: "hello world" }]],
      } as unknown as Parameters<NonNullable<typeof mockSR.onresult>>[0]);
    });
    expect(result.current.transcript).toBe("hello world");

    // Restore
    if (OrigSR) (globalThis as Record<string, unknown>).webkitSpeechRecognition = OrigSR;
    else delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
  });

  it("stops recording", async () => {
    const { useVoice } = await import("@/hooks/use-voice");
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.stopRecording();
    });
    expect(result.current.recording).toBe(false);
  });
});
