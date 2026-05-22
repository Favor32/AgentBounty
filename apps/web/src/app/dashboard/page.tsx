"use client";

import { useState, useEffect, useCallback } from "react";
import { BountyCard } from "@/components/BountyCard";
import { AgentFeed } from "@/components/AgentFeed";
import { api } from "@/lib/api";
import type { Bounty, EscrowStatus } from "@/components";

const FILTERS: { label: string; value: EscrowStatus | "ALL" }[] = [
  { label: "ALL",       value: "ALL" },
  { label: "FUNDED",    value: "FUNDED" },
  { label: "CLAIMED",   value: "CLAIMED" },
  { label: "VERIFYING", value: "VERIFYING" },
  { label: "RELEASED",  value: "RELEASED" },
  { label: "REFUNDED",  value: "REFUNDED" },
];

export default function DashboardPage() {
  const [bounties, setBounties]     = useState<Bounty[]>([]);
  const [filter, setFilter]         = useState<EscrowStatus | "ALL">("ALL");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchBounties = useCallback(async () => {
    const res = await api.bounties.list();
    if (res.success && res.data) {
      setBounties(res.data);
      setError(null);
    } else {
      setError(res.error ?? "Failed to load bounties");
    }
    setLoading(false);
    setLastRefresh(Date.now());
  }, []);

  useEffect(() => {
    fetchBounties();
    // Poll every 10s for live status updates
    const interval = setInterval(fetchBounties, 10000);
    return () => clearInterval(interval);
  }, [fetchBounties]);

  const filtered =
    filter === "ALL" ? bounties : bounties.filter((b) => b.status === filter);

  const counts = bounties.reduce(
    (acc, b) => ({ ...acc, [b.status]: (acc[b.status as keyof typeof acc] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  const totalEth = bounties
    .filter((b) => b.status === "FUNDED")
    .reduce((sum, b) => sum + parseFloat(b.rewardEth), 0);

  return (
    <div className="min-h-screen bg-void p-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-dim text-xs tracking-widest mb-1">// AGENTBOUNTY</div>
            <h1 className="font-display text-bright text-2xl font-bold tracking-wide">
              BOUNTY BOARD
            </h1>
          </div>
          <button
            onClick={fetchBounties}
            className="text-dim hover:text-neon text-xs font-mono transition-colors border border-border hover:border-neon/30 px-3 py-1.5 rounded"
          >
            ⟳ REFRESH
          </button>
        </div>

        {/* Stats bar */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: "total bounties",  value: bounties.length,           color: "text-bright" },
            { label: "funded / open",   value: counts["FUNDED"] ?? 0,     color: "text-neon" },
            { label: "in verification", value: counts["VERIFYING"] ?? 0,  color: "text-blue" },
            { label: "ETH locked",      value: `${totalEth.toFixed(3)}Ξ`, color: "text-amber" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="glass rounded-lg px-4 py-3"
            >
              <div className={`text-xl font-bold font-display ${color}`}>{value}</div>
              <div className="text-dim text-[10px] tracking-widest mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`text-[10px] font-mono tracking-widest px-3 py-1.5 rounded border transition-all duration-150 ${
                  filter === value
                    ? "border-neon/40 bg-neon/10 text-neon"
                    : "border-border text-dim hover:text-muted hover:border-dim"
                }`}
              >
                {label}
                {value !== "ALL" && counts[value] !== undefined && (
                  <span className="ml-1.5 opacity-60">({counts[value]})</span>
                )}
              </button>
            ))}
            <span className="ml-auto text-dim text-[10px] font-mono">
              last sync{" "}
              {new Date(lastRefresh).toLocaleTimeString("en-US", {
                hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </span>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass rounded-lg p-5 h-48 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="h-3 bg-border rounded w-1/3 mb-3" />
                  <div className="h-4 bg-border rounded w-3/4 mb-2" />
                  <div className="h-3 bg-border rounded w-full mb-1" />
                  <div className="h-3 bg-border rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="glass rounded-lg p-8 text-center">
              <div className="text-red text-sm mb-2">⚠ Connection error</div>
              <div className="text-dim text-xs">{error}</div>
              <div className="text-dim text-xs mt-2">
                Make sure the API server is running on{" "}
                <span className="text-muted">
                  {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}
                </span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-lg p-8 text-center">
              <div className="text-dim text-4xl mb-3">◎</div>
              <div className="text-muted text-sm">No bounties found</div>
              <div className="text-dim text-xs mt-1">
                {filter !== "ALL"
                  ? `No bounties with status ${filter}`
                  : "Atlas hasn't posted any bounties yet"}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
              {filtered.map((b, i) => (
                <BountyCard key={b.id} bounty={b} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar — Atlas feed */}
        <div className="w-72 shrink-0 hidden lg:block">
          <div className="glass rounded-lg p-4 sticky top-8">
            <div className="text-dim text-[10px] tracking-widest mb-3">
              // ATLAS ACTIVITY
            </div>
            <AgentFeed compact />
          </div>
        </div>
      </div>
    </div>
  );
}