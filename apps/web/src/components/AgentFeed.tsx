"use client";

import { useState, useEffect, useRef } from "react";

interface AgentEvent {
  id: string;
  timestamp: number;
  type: "create" | "analyze" | "release" | "refund" | "info";
  message: string;
  bountyId?: string;
  amount?: string;
}

const DEMO_EVENTS: AgentEvent[] = [
  {
    id: "e1",
    timestamp: Date.now() - 3600000,
    type: "analyze",
    message: "Scanning repository commit history for test coverage gaps...",
  },
  {
    id: "e2",
    timestamp: Date.now() - 3500000,
    type: "create",
    message: "Identified: src/middleware/auth.ts has 0% test coverage. Creating bounty.",
    bountyId: "bounty-demo-1",
    amount: "0.05",
  },
  {
    id: "e3",
    timestamp: Date.now() - 1800000,
    type: "analyze",
    message: "Detected 47 duplicate disconnect errors in prod logs over 24h window.",
  },
  {
    id: "e4",
    timestamp: Date.now() - 1700000,
    type: "create",
    message: "WebSocket race condition confirmed. Funding 0.08 ETH escrow.",
    bountyId: "bounty-demo-2",
    amount: "0.08",
  },
  {
    id: "e5",
    timestamp: Date.now() - 900000,
    type: "release",
    message: "CI passed for bounty-demo-3. Releasing 0.12 ETH to developer.",
    bountyId: "bounty-demo-3",
    amount: "0.12",
  },
];

const TYPE_CONFIG = {
  create:  { icon: "⊕", color: "text-neon",  prefix: "BOUNTY_CREATE" },
  analyze: { icon: "◎", color: "text-blue",  prefix: "SCAN" },
  release: { icon: "↑", color: "text-neon",  prefix: "RELEASE" },
  refund:  { icon: "↩", color: "text-red",   prefix: "REFUND" },
  info:    { icon: "▸", color: "text-muted", prefix: "INFO" },
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function AgentFeed({ compact = false }: { compact?: boolean }) {
  const [events, setEvents] = useState<AgentEvent[]>(DEMO_EVENTS);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, streamText]);

  // Simulate a live Atlas event every 20s for demo effect
  useEffect(() => {
    const messages = [
      { type: "analyze" as const, message: "Running static analysis on open PRs..." },
      { type: "info"    as const, message: "Deadline check: 2 bounties within 12h window." },
      { type: "analyze" as const, message: "Evaluating complexity of issue #23..." },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      const msg = messages[idx % messages.length];
      const newEvent: AgentEvent = {
        id: `live-${Date.now()}`,
        timestamp: Date.now(),
        ...msg,
      };
      setEvents((prev) => [...prev.slice(-20), newEvent]);
      idx++;
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const displayEvents = compact ? events.slice(-5) : events;

  return (
    <div className="font-mono text-xs">
      {/* Terminal header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-neon/60" />
        </div>
        <span className="text-dim text-[10px] tracking-widest ml-1">
          atlas.agent // event_stream
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="status-dot funded" />
          <span className="text-dim text-[10px]">live</span>
        </div>
      </div>

      {/* Event log */}
      <div className={compact ? "space-y-2" : "space-y-2 max-h-80 overflow-y-auto pr-1"}>
        {displayEvents.map((event) => {
          const cfg = TYPE_CONFIG[event.type];
          return (
            <div
              key={event.id}
              className="flex gap-2 animate-fade-in"
            >
              <span className="text-dim shrink-0">{formatTime(event.timestamp)}</span>
              <span className={`shrink-0 ${cfg.color}`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <span className={`${cfg.color} text-[10px] tracking-widest mr-2`}>
                  [{cfg.prefix}]
                </span>
                <span className="text-body">{event.message}</span>
                {event.bountyId && (
                  <div className="mt-0.5 text-dim">
                    id={event.bountyId}
                    {event.amount && ` amount=${event.amount}ETH`}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming line */}
        {streaming && (
          <div className="flex gap-2">
            <span className="text-dim">{formatTime(Date.now())}</span>
            <span className="text-blue">◎</span>
            <span className="text-body">
              {streamText}
              <span className="text-neon animate-blink">█</span>
            </span>
          </div>
        )}

        {/* Idle cursor */}
        {!streaming && (
          <div className="flex gap-2 text-dim">
            <span>{formatTime(Date.now())}</span>
            <span>▸</span>
            <span>
              atlas@agent:~${" "}
              <span className="text-neon animate-blink">█</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}