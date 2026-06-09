import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SSEClient } from "@/lib/sse-client";

class MockEventSource {
  url: string;
  onerror: ((e: Event) => void) | null = null;
  readyState = 0;
  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  close = vi.fn();
}

describe("SSEClient", () => {
  const OrigES = globalThis.EventSource;

  beforeEach(() => {
    MockEventSource.instances = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).EventSource = MockEventSource;
  });

  afterEach(() => {
    (globalThis as any).EventSource = OrigES;
  });

  it("connect creates EventSource with URL", () => {
    const client = new SSEClient();
    client.connect("/api/chat/stream?stream_id=abc", { done: vi.fn() });
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/chat/stream?stream_id=abc");
  });

  it("close calls EventSource.close", () => {
    const client = new SSEClient();
    client.connect("/test", { done: vi.fn() });
    client.close();
    expect(MockEventSource.instances[0].close).toHaveBeenCalled();
  });

  it("isConnected reflects state", () => {
    const client = new SSEClient();
    expect(client.isConnected).toBe(false);
    client.connect("/test", { done: vi.fn() });
    expect(client.isConnected).toBe(true);
    client.close();
    expect(client.isConnected).toBe(false);
  });

  it("parseSSEChunk parses message event", () => {
    const raw = 'event: message\ndata: {"content":"hello"}\n\n';
    const events = SSEClient.parseSSEChunk(raw);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("message");
    expect(events[0].data).toEqual({ content: "hello" });
  });

  it("parseSSEChunk parses heartbeat", () => {
    const raw = "event: heartbeat\ndata: {}\n\n";
    const events = SSEClient.parseSSEChunk(raw);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("heartbeat");
  });

  it("parseSSEChunk handles multiple events", () => {
    const raw = 'event: message\ndata: {"a":1}\n\nevent: done\ndata: {}\n\n';
    const events = SSEClient.parseSSEChunk(raw);
    expect(events).toHaveLength(2);
    expect(events[0].event).toBe("message");
    expect(events[1].event).toBe("done");
  });
});
