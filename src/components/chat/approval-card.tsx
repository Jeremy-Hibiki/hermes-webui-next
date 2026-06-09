"use client";

import type { ApprovalRequest } from "@/types";
import { Shield, Check, X } from "lucide-react";

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ApprovalCard({ request, onApprove, onReject }: ApprovalCardProps) {
  return (
    <div className="border border-[var(--warning)] rounded-lg bg-[var(--surface)] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-[var(--warning)]" />
        <span className="font-medium text-sm text-[var(--text)]">{request.tool_name}</span>
        <span className="text-xs text-[var(--muted)]">wants permission</span>
      </div>

      {Object.keys(request.tool_args).length > 0 && (
        <pre className="text-xs p-2 rounded bg-[var(--code-bg)] overflow-x-auto text-[var(--code-text)]">
          {JSON.stringify(request.tool_args, null, 2)}
        </pre>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onApprove(request.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--success)] text-white hover:opacity-90 transition-opacity"
        >
          <Check className="w-3.5 h-3.5" />
          Approve
        </button>
        <button
          onClick={() => onReject(request.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--error)] text-white hover:opacity-90 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}
