import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommands } from "@/hooks/use-commands";

describe("useCommands", () => {
  it("returns empty completions initially", () => {
    const { result } = renderHook(() => useCommands());
    expect(result.current.completions).toEqual([]);
  });

  it("provides completions for partial input", () => {
    const { result } = renderHook(() => useCommands());
    act(() => {
      result.current.updateInput("/mo");
    });
    expect(result.current.completions).toContain("model");
    expect(result.current.completions).not.toContain("help");
  });

  it("clears completions for non-slash input", () => {
    const { result } = renderHook(() => useCommands());
    act(() => {
      result.current.updateInput("/mo");
    });
    expect(result.current.completions.length).toBeGreaterThan(0);
    act(() => {
      result.current.updateInput("hello");
    });
    expect(result.current.completions).toEqual([]);
  });

  it("selects a completion", () => {
    const { result } = renderHook(() => useCommands());
    act(() => {
      result.current.updateInput("/mo");
    });
    act(() => {
      result.current.selectCompletion("model");
    });
    expect(result.current.selectedCommand).toBe("model");
    expect(result.current.completions).toEqual([]);
  });
});
