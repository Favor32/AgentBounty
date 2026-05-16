"use client";

import clsx from "clsx";
import type { EscrowStatus } from "@/src/components/EscrowStatus";

const CONFIG: Record<
  EscrowStatus,
  { label: string; color: string; dotClass: string; bg: string }
> = {
  FUNDED:    { label: "FUNDED",    color: "text-neon",  dotClass: "funded",    bg: "bg-neon/10 border-neon/30" },
  CLAIMED:   { label: "CLAIMED",   color: "text-amber", dotClass: "claimed",   bg: "bg-amber/10 border-amber/30" },
  VERIFYING: { label: "VERIFYING", color: "text-blue",  dotClass: "verifying", bg: "bg-blue/10 border-blue/30" },
  RELEASED:  { label: "RELEASED",  color: "text-neon",  dotClass: "released",  bg: "bg-neon/10 border-neon/20" },
  REFUNDED:  { label: "REFUNDED",  color: "text-red",   dotClass: "refunded",  bg: "bg-red/10 border-red/30" },
  DISPUTED:  { label: "DISPUTED",  color: "text-red",   dotClass: "disputed",  bg: "bg-red/10 border-red/30" },
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: EscrowStatus;
  size?: "sm" | "lg";
}) {
  const cfg = CONFIG[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 border rounded font-mono font-bold tracking-widest",
        cfg.bg,
        cfg.color,
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"
      )}
    >
      <span className={clsx("status-dot", cfg.dotClass)} />
      {cfg.label}
    </span>
  );
}

// ── Full lifecycle bar (for bounty detail page) ───────────────────────────

const STEPS: EscrowStatus[] = [
  "FUNDED", "CLAIMED", "VERIFYING", "RELEASED",
];

export function EscrowLifecycle({ status }: { status: EscrowStatus }) {
  const currentIndex = STEPS.indexOf(status);
  const isTerminal   = status === "REFUNDED" || status === "DISPUTED";

  return (
    <div className="w-full">
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done   = !isTerminal && i <= currentIndex;
          const active = !isTerminal && i === currentIndex;
          const cfg    = CONFIG[step];

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Node */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={clsx(
                    "w-7 h-7 rounded border flex items-center justify-center text-xs font-bold transition-all duration-500",
                    done
                      ? `border-neon/50 bg-neon/15 text-neon ${active ? "border-neon-glow" : ""}`
                      : "border-border bg-panel text-dim"
                  )}
                >
                  {done && !active ? "✓" : i + 1}
                </div>
                <span
                  className={clsx(
                    "text-[9px] font-mono tracking-widest whitespace-nowrap",
                    done ? cfg.color : "text-dim"
                  )}
                >
                  {step}
                </span>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div
                  className={clsx(
                    "h-px flex-1 mx-1 transition-all duration-700",
                    i < currentIndex && !isTerminal
                      ? "bg-neon/40"
                      : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Terminal states */}
      {isTerminal && (
        <div
          className={clsx(
            "mt-3 text-center text-xs font-bold tracking-widest py-1.5 rounded border",
            status === "REFUNDED"
              ? "text-red border-red/30 bg-red/10"
              : "text-red border-red/40 bg-red/10 animate-pulse"
          )}
        >
          {status === "REFUNDED" ? "⟲ REFUNDED TO AGENT" : "⚠ DISPUTED — ARBITRATOR REVIEW"}
        </div>
      )}
    </div>
  );
}