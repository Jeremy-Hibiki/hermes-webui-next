"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as TerminalIcon, X, Copy, RotateCw, ChevronUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TerminalPanelProps {
  sessionId: string;
}

type TerminalStatus = "connecting" | "connected" | "disconnected" | "error";

export function TerminalPanel({ sessionId }: TerminalPanelProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<InstanceType<typeof import("@xterm/xterm").Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import("@xterm/addon-fit").FitAddon> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [status, setStatus] = useState<TerminalStatus>("disconnected");
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(300);
  const [copied, setCopied] = useState(false);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const getTheme = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    const get = (v: string) => style.getPropertyValue(v).trim() || undefined;
    return {
      background: get("--code-bg") || get("--bg") || "#1e1e2e",
      foreground: get("--pre-text") || get("--text") || "#cdd6f4",
      cursor: get("--accent") || "#89b4fa",
      cursorAccent: get("--bg") || "#1e1e2e",
      selectionBackground: get("--accent") || "#89b4fa55",
      black: "#45475a",
      red: "#f38ba8",
      green: "#a6e3a1",
      yellow: "#f9e2af",
      blue: "#89b4fa",
      magenta: "#f5c2e7",
      cyan: "#94e2d5",
      white: "#bac2de",
      brightBlack: "#585b70",
      brightRed: "#f38ba8",
      brightGreen: "#a6e3a1",
      brightYellow: "#f9e2af",
      brightBlue: "#89b4fa",
      brightMagenta: "#f5c2e7",
      brightCyan: "#94e2d5",
      brightWhite: "#a6adc8",
    };
  }, []);

  const sendInput = useCallback(
    async (data: string) => {
      if (!sessionId) return;
      try {
        await fetch(`${API_BASE}/terminal/input`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId, data }),
        });
      } catch {
        // Connection lost
      }
    },
    [sessionId],
  );

  const startTerminal = useCallback(async () => {
    if (!termRef.current) return;

    setStatus("connecting");

    try {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      await import("@xterm/xterm/css/xterm.css");

      const term = new Terminal({
        theme: getTheme(),
        fontSize: 13,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        cursorBlink: true,
        convertEol: true,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      term.open(termRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      const cols = term.cols;
      const rows = term.rows;

      const res = await fetch(`${API_BASE}/terminal/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId, rows, cols }),
      });

      if (!res.ok) throw new Error(`Terminal start failed: ${res.status}`);

      setStatus("connected");

      term.onData((data) => {
        void sendInput(data);
      });

      // SSE output stream
      const es = new EventSource(
        `${API_BASE}/terminal/output?session_id=${encodeURIComponent(sessionId)}`,
        {
          withCredentials: true,
        },
      );
      eventSourceRef.current = es;

      es.addEventListener("output", (e) => {
        if (e.data) {
          term.write(e.data);
        }
      });

      es.addEventListener("terminal_closed", () => {
        setStatus("disconnected");
        es.close();
      });

      es.addEventListener("terminal_error", (e) => {
        if (e.data) term.write(`\r\n\x1b[31m${e.data}\x1b[0m`);
        setStatus("error");
        es.close();
      });

      es.onerror = () => {
        setStatus("error");
      };

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        const r = term.rows;
        const c = term.cols;
        fetch(`${API_BASE}/terminal/resize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId, rows: r, cols: c }),
        }).catch(() => {});
      });
      resizeObserver.observe(termRef.current);
    } catch (err) {
      setStatus("error");
      if (termRef.current) {
        termRef.current.textContent = `Failed to start terminal: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    }
  }, [sessionId, getTheme, sendInput]);

  const closeTerminal = useCallback(async () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    xtermRef.current?.dispose();
    xtermRef.current = null;
    fitAddonRef.current = null;
    setStatus("disconnected");

    try {
      await fetch(`${API_BASE}/terminal/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      // Already closed
    }

    // Use sendBeacon for cleanup on page unload
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/terminal/close`, JSON.stringify({ session_id: sessionId }));
    }
  }, [sessionId]);

  const restartTerminal = useCallback(async () => {
    await closeTerminal();
    await startTerminal();
  }, [closeTerminal, startTerminal]);

  const handleCopy = useCallback(async () => {
    const term = xtermRef.current;
    if (!term) return;
    // Get all content from the terminal buffer
    const buffer = term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      lines.push(buffer.getLine(i)?.translateToString(true) ?? "");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Start terminal on mount
  useEffect(() => {
    void startTerminal();
    return () => {
      void closeTerminal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Drag resize handler
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: height };
      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - ev.clientY;
        const newH = Math.max(120, Math.min(600, dragRef.current.startH + delta));
        setHeight(newH);
      };
      const handleUp = () => {
        dragRef.current = null;
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUp);
        fitAddonRef.current?.fit();
      };
      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
    },
    [height],
  );

  if (collapsed) {
    return (
      <div className="border-t border-[var(--border)] bg-[var(--surface)]">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <TerminalIcon className="w-3 h-3" />
            Terminal
          </span>
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-[var(--border)]" style={{ height }}>
      {/* Resize handle */}
      <div
        className="flex items-center justify-center h-1.5 cursor-row-resize bg-[var(--surface)] hover:bg-[var(--accent)] transition-colors"
        onPointerDown={handleDragStart}
      >
        <div className="w-8 h-0.5 rounded-full bg-[var(--border)]" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[var(--border)] bg-[var(--surface)]">
        <span className="text-xs text-[var(--muted)] flex items-center gap-1.5">
          <TerminalIcon className="w-3 h-3" />
          Terminal
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              status === "connected" && "bg-green-500",
              status === "connecting" && "bg-yellow-500 animate-pulse",
              status === "error" && "bg-red-500",
              status === "disconnected" && "bg-[var(--border)]",
            )}
          />
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[var(--muted)]"
            onClick={() => void handleCopy()}
            title="Copy"
            aria-label="Copy terminal content"
          >
            {copied ? (
              <span className="text-[var(--accent)] text-[10px]">✓</span>
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[var(--muted)]"
            onClick={() => void restartTerminal()}
            title="Restart"
            aria-label="Restart terminal"
          >
            <RotateCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[var(--muted)]"
            onClick={() => setCollapsed(true)}
            title="Collapse"
            aria-label="Collapse terminal"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[var(--muted)]"
            onClick={() => void closeTerminal()}
            title="Close"
            aria-label="Close terminal"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Terminal viewport */}
      <div className="flex-1 overflow-hidden bg-[var(--code-bg)]" data-testid="terminal-container">
        <div ref={termRef} className="h-full w-full" />
      </div>
    </div>
  );
}
