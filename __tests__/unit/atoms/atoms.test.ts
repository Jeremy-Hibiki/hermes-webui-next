import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import type { Session } from "@/types";
import {
  activeSessionAtom,
  sessionsListAtom,
  pinnedSessionIdsAtom,
} from "@/atoms/session";
import {
  activeProfileAtom,
  themeAtom,
  skinAtom,
  fontSizeAtom,
  assistantDisplayNameAtom,
  isActiveProfileDefaultAtom,
} from "@/atoms/settings";
import { busyAtom, messagesAtom } from "@/atoms/chat";
import { sidebarCollapsedAtom, workspacePanelOpenAtom } from "@/atoms/ui";

describe("Session atoms", () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it("activeSession defaults to null", () => {
    expect(store.get(activeSessionAtom)).toBeNull();
  });

  it("sessionsList defaults to empty", () => {
    expect(store.get(sessionsListAtom)).toEqual([]);
  });

  it("can set active session", () => {
    const s: Session = {
      id: "s1", title: "Test", created_at: "", updated_at: "",
      messages: [], model: null, provider: null, workspace: null,
      profile: "default", pinned: false, archived: false,
      project_id: null, message_count: 0,
    };
    store.set(activeSessionAtom, s);
    expect(store.get(activeSessionAtom)?.id).toBe("s1");
  });

  it("pinnedSessionIds derives from list", () => {
    store.set(sessionsListAtom, [
      { id: "s1", pinned: true } as Session,
      { id: "s2", pinned: false } as Session,
    ]);
    expect(store.get(pinnedSessionIdsAtom)).toEqual(["s1"]);
  });
});

describe("Settings atoms", () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it("defaults: profile=default, theme=system, skin=default", () => {
    expect(store.get(activeProfileAtom)).toBe("default");
    expect(store.get(themeAtom)).toBe("system");
    expect(store.get(skinAtom)).toBe("default");
    expect(store.get(fontSizeAtom)).toBe("default");
  });

  it("isActiveProfileDefault derived atom", () => {
    expect(store.get(isActiveProfileDefaultAtom)).toBe(true);
    store.set(activeProfileAtom, "custom");
    expect(store.get(isActiveProfileDefaultAtom)).toBe(false);
  });

  it("assistantDisplayName returns Hermes for default", () => {
    expect(store.get(assistantDisplayNameAtom)).toBe("Hermes");
    store.set(activeProfileAtom, "claude");
    expect(store.get(assistantDisplayNameAtom)).toBe("Claude");
  });
});

describe("Chat atoms", () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it("busy defaults false, messages empty", () => {
    expect(store.get(busyAtom)).toBe(false);
    expect(store.get(messagesAtom)).toEqual([]);
  });
});

describe("UI atoms", () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it("sidebar not collapsed, workspace open by default", () => {
    expect(store.get(sidebarCollapsedAtom)).toBe(false);
    expect(store.get(workspacePanelOpenAtom)).toBe(true);
  });
});
