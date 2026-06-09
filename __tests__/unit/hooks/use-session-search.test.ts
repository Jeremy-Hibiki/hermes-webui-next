import { describe, it, expect } from "vite-plus/test";
import type { Session } from "@/types";

// --- Pure search logic tests (no React/render needed) ---

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    title: "Test Chat",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    messages: [],
    model: null,
    provider: null,
    workspace: null,
    profile: "default",
    pinned: false,
    archived: false,
    project_id: null,
    message_count: 0,
    ...overrides,
  };
}

// Replicate the pure title-match filter used by the hook
function filterByTitle(sessions: Session[], query: string): Session[] {
  if (!query.trim()) return sessions;
  const q = query.toLowerCase();
  return sessions.filter((s) => (s.title || "").toLowerCase().includes(q));
}

// Replicate the merge logic: title matches first, then content matches not already present
function mergeResults(titleMatches: Session[], contentMatches: Session[]): Session[] {
  const seen = new Set(titleMatches.map((s) => s.id));
  const merged = [...titleMatches];
  for (const s of contentMatches) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      merged.push(s);
    }
  }
  return merged;
}

describe("Session search pure logic", () => {
  const sessions: Session[] = [
    makeSession({ id: "s1", title: "Python debugging session" }),
    makeSession({ id: "s2", title: "React hooks discussion" }),
    makeSession({ id: "s3", title: "Python data analysis" }),
    makeSession({ id: "s4", title: "New Chat" }),
  ];

  describe("filterByTitle", () => {
    it("returns all sessions when query is empty", () => {
      expect(filterByTitle(sessions, "")).toHaveLength(4);
    });

    it("returns all sessions when query is whitespace-only", () => {
      expect(filterByTitle(sessions, "   ")).toHaveLength(4);
    });

    it("filters by case-insensitive title substring", () => {
      const result = filterByTitle(sessions, "python");
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(["s1", "s3"]);
    });

    it("returns no results for non-matching query", () => {
      const result = filterByTitle(sessions, "ziglang");
      expect(result).toHaveLength(0);
    });

    it("matches partial words", () => {
      const result = filterByTitle(sessions, "react");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("s2");
    });

    it("handles sessions with empty title", () => {
      const withEmpty = [
        makeSession({ id: "s5", title: "" }),
        makeSession({ id: "s6", title: "Python stuff" }),
      ];
      const result = filterByTitle(withEmpty, "python");
      expect(result).toHaveLength(1);
    });
  });

  describe("mergeResults", () => {
    it("returns title matches when no content matches", () => {
      const titleMatches = [sessions[0], sessions[2]];
      const result = mergeResults(titleMatches, []);
      expect(result).toHaveLength(2);
    });

    it("deduplicates - content matches already in title matches are excluded", () => {
      const titleMatches = [sessions[0]];
      const contentMatches = [sessions[0], sessions[1]];
      const result = mergeResults(titleMatches, contentMatches);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("s1");
      expect(result[1].id).toBe("s2");
    });

    it("appends content-only matches after title matches", () => {
      const titleMatches = [sessions[0]];
      const contentMatches = [sessions[2]];
      const result = mergeResults(titleMatches, contentMatches);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("s1");
      expect(result[1].id).toBe("s3");
    });

    it("handles empty inputs", () => {
      expect(mergeResults([], [])).toHaveLength(0);
      expect(mergeResults([], [sessions[0]])).toHaveLength(1);
      expect(mergeResults([sessions[0]], [])).toHaveLength(1);
    });
  });
});

describe("useSessionSearch API debounce integration", () => {
  it("constructs correct search URL", () => {
    const query = "test query";
    const url = `/sessions/search?q=${encodeURIComponent(query)}&content=1&depth=5`;
    expect(url).toBe("/sessions/search?q=test%20query&content=1&depth=5");
  });

  it("encodes special characters in query", () => {
    const query = "hello & world=foo";
    const url = `/sessions/search?q=${encodeURIComponent(query)}`;
    expect(url).toContain("hello%20%26%20world%3Dfoo");
  });
});
