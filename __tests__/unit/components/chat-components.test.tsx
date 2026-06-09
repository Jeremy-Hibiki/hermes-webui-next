import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ToolCallCard } from "@/components/chat/tool-call-card";
import { ThinkingCard } from "@/components/chat/thinking-card";
import { ApprovalCard } from "@/components/chat/approval-card";
import type { Message, ToolCall, ApprovalRequest } from "@/types";

describe("MessageBubble", () => {
  it("renders user message", () => {
    render(<MessageBubble message={{ id: "m1", role: "user", content: "Hello", timestamp: "" } as Message} />);
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("user")).toBeDefined();
  });

  it("renders assistant message", () => {
    render(<MessageBubble message={{ id: "m2", role: "assistant", content: "Hi there", timestamp: "" } as Message} />);
    expect(screen.getByText("Hi there")).toBeDefined();
  });

  it("shows copy button for assistant messages", () => {
    render(<MessageBubble message={{ id: "m3", role: "assistant", content: "Copy me", timestamp: "" } as Message} />);
    expect(screen.getByLabelText(/copy/i)).toBeDefined();
  });
});

describe("ToolCallCard", () => {
  it("renders tool name and status", () => {
    const tc: ToolCall = { id: "tc1", name: "read_file", arguments: '{"path":"/tmp/test"}', status: "completed", result: "file contents" };
    render(<ToolCallCard toolCall={tc} />);
    expect(screen.getByText("read_file")).toBeDefined();
    expect(screen.getByText("completed")).toBeDefined();
  });

  it("can expand to show arguments", () => {
    const tc: ToolCall = { id: "tc2", name: "write_file", arguments: '{"path":"/tmp/out"}', status: "running" };
    render(<ToolCallCard toolCall={tc} />);
    const btn = screen.getByLabelText(/expand/i);
    fireEvent.click(btn);
    expect(screen.getByText(/\/tmp\/out/)).toBeDefined();
  });
});

describe("ThinkingCard", () => {
  it("renders thinking content when expanded", () => {
    render(<ThinkingCard content="Let me think about this..." />);
    // Click to expand
    fireEvent.click(screen.getByText("Thinking"));
    expect(screen.getByText(/think about this/)).toBeDefined();
  });

  it("starts collapsed", () => {
    render(<ThinkingCard content="Hidden thought" />);
    expect(screen.getByText(/thinking/i)).toBeDefined();
  });
});

describe("ApprovalCard", () => {
  it("renders approval request with tool name", () => {
    const req: ApprovalRequest = { id: "a1", session_id: "s1", tool_name: "bash", tool_args: { command: "rm -rf /" }, stream_id: "st1", created_at: "" };
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<ApprovalCard request={req} onApprove={onApprove} onReject={onReject} />);
    expect(screen.getByText("bash")).toBeDefined();
  });

  it("calls onApprove when approve clicked", () => {
    const req: ApprovalRequest = { id: "a2", session_id: "s1", tool_name: "edit", tool_args: {}, stream_id: "st2", created_at: "" };
    const onApprove = vi.fn();
    render(<ApprovalCard request={req} onApprove={onApprove} onReject={vi.fn()} />);
    fireEvent.click(screen.getByText(/approve/i));
    expect(onApprove).toHaveBeenCalledWith("a2");
  });

  it("calls onReject when reject clicked", () => {
    const req: ApprovalRequest = { id: "a3", session_id: "s1", tool_name: "edit", tool_args: {}, stream_id: "st3", created_at: "" };
    const onReject = vi.fn();
    render(<ApprovalCard request={req} onApprove={vi.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByText(/reject/i));
    expect(onReject).toHaveBeenCalledWith("a3");
  });
});
