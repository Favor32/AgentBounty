"use client";

import { useState } from "react";
import { AgentFeed } from "@/components/AgentFeed";
import { BountyCard } from "@/components/BountyCard";
import { api } from "@/lib/api";
import type { Bounty } from "@/types/index";

export default function AgentPage() {
  const [repoUrl, setRepoUrl]       = useState("https://github.com/demo-org/demo-repo");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated]   = useState<Bounty | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [streamLines, setStreamLines] = useState<string[]>([]);

  async function handleGenerate() {
    if (!repoUrl.trim()) return;
    setGenerating(true);
    setGenerated(null);
    setError(null);
    setStreamLines([]);

    // Stream agent reasoning from SSE
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    try {
      const eventSource = new EventSource(
        `${apiBase}/agent/stream?repo=${encodeURIComponent(repoUrl)}`
      );

      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.token) {
          setStreamLines((prev) => {
            const last = prev[prev.length - 1] ?? "";
            return [...prev.slice(0, -1), last + data.token];
          });
        }
        if (data.done || data.error) {
          eventSource.close();
        }
      };

      // Also trigger actual bounty generation
      const res = await api.bounties.agentGenerate(repoUrl.trim());
      if (res.success && res.data) {
        setGenerated(res.data);
      } else {
        setError(res.error ?? "Generation failed");
      }
    } catch {
      setError("Could not reach API. Is the backend running?");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-void p-8">
      <div className="mb-8">
        <div className="text-dim text-xs tracking-widest mb-1">// AGENTBOUNTY</div>
        <h1 className="font-display text-bright text-2xl font-bold tracking-wide">
          ATLAS <span className="text-neon">AGENT</span>
        </h1>
        <p className="text-muted text-xs mt-1">
          Autonomous AI agent powered by Claude. Detects code quality issues and funds escrow bounties.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Agent trigger */}
        <div className="space-y-5">
          {/* Generate panel */}
          <div className="glass rounded-lg p-5">
            <div className="text-dim text-[10px] tracking-widest mb-4">
              // TRIGGER ATLAS SCAN
            </div>
            <div className="flex items-center gap-2 mb-3 text-xs text-muted font-mono">
              <span className="text-neon">◎</span>
              <span>atlas@agent:~ $ scan --repo</span>
            </div>
            <div className="flex gap-3">
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="flex-1 bg-void border border-border rounded px-3 py-2 text-xs font-mono text-bright placeholder-dim focus:outline-none focus:border-neon/40"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !repoUrl.trim()}
                className="bg-neon text-void font-bold px-5 py-2 rounded text-xs tracking-widest hover:bg-neon/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap hover:shadow-[0_0_16px_rgba(0,255,148,0.4)]"
              >
                {generating ? "SCANNING..." : "⊕ SCAN REPO"}
              </button>
            </div>
            <p className="text-dim text-[10px] mt-2">
              Atlas will analyze the repository context via Claude API and generate a
              bounty task automatically.
            </p>
          </div>

          {/* Streaming reasoning */}
          {(generating || streamLines.length > 0) && (
            <div className="glass rounded-lg p-5 border-l-2 border-neon/20">
              <div className="text-dim text-[10px] tracking-widest mb-3">
                // ATLAS REASONING (LIVE)
              </div>
              <div className="text-xs font-mono space-y-1">
                {streamLines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-neon shrink-0">▸</span>
                    <span className="text-body">{line}</span>
                  </div>
                ))}
                {generating && (
                  <div className="flex gap-2">
                    <span className="text-neon shrink-0">▸</span>
                    <span className="text-neon animate-blink">█</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="glass rounded-lg p-4 border border-red/30">
              <div className="text-red text-xs">⚠ {error}</div>
            </div>
          )}

          {/* Generated bounty */}
          {generated && (
            <div>
              <div className="text-dim text-[10px] tracking-widest mb-3">
                // BOUNTY GENERATED
              </div>
              <BountyCard bounty={generated} />
            </div>
          )}

          {/* How it works */}
          <div className="glass rounded-lg p-5">
            <div className="text-dim text-[10px] tracking-widest mb-3">
              // HOW ATLAS WORKS
            </div>
            <ol className="space-y-3 text-xs">
              {[
                { n: "01", text: "Atlas receives repository context: commits, open issues, test files" },
                { n: "02", text: "Claude API analyzes gaps: missing tests, security holes, bugs" },
                { n: "03", text: "Atlas generates a structured bounty with reward amount and test command" },
                { n: "04", text: "Trustless Work SDK locks funds in a non-custodial escrow" },
                { n: "05", text: "Human developer claims, builds, and submits a PR" },
                { n: "06", text: "GitHub Actions runs the test suite automatically" },
                { n: "07", text: "Webhook triggers: pass → release funds / fail → refund agent" },
              ].map(({ n, text }) => (
                <li key={n} className="flex gap-3">
                  <span className="text-neon font-bold shrink-0">{n}</span>
                  <span className="text-muted">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: Live event feed */}
        <div className="space-y-5">
          <div className="glass rounded-lg p-5">
            <div className="text-dim text-[10px] tracking-widest mb-4">
              // LIVE EVENT STREAM
            </div>
            <AgentFeed />
          </div>

          {/* Agent identity card */}
          <div className="glass rounded-lg p-5 border border-neon/10">
            <div className="text-dim text-[10px] tracking-widest mb-3">
              // AGENT IDENTITY
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded border border-neon/30 bg-neon/10 flex items-center justify-center text-neon text-xl">
                ◎
              </div>
              <div>
                <div className="text-bright font-bold text-sm">ATLAS</div>
                <div className="text-dim text-xs">autonomous software agent</div>
              </div>
              <div className="ml-auto">
                <span className="status-dot funded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "model",    value: "claude-opus-4" },
                { label: "role",     value: "employer / funder" },
                { label: "network",  value: "sepolia" },
                { label: "escrows",  value: "non-custodial" },
                { label: "release",  value: "CI-triggered" },
                { label: "disputes", value: "arbitrator DAO" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-panel rounded p-2">
                  <div className="text-dim text-[10px] tracking-wider">{label}</div>
                  <div className="text-muted font-mono">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}