"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { StatusBadge, EscrowLifecycle } from "@/components/EscrowStatus";
import { api } from "@/lib/api";
import type { Bounty } from "@/types";

function truncateAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export default function BountyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();

  const [bounty, setBounty]   = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);
  const [prUrl, setPrUrl]     = useState("");
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBounty = useCallback(async () => {
    const res = await api.bounties.get(id);
    if (res.success && res.data) {
      setBounty(res.data);
    } else {
      setError(res.error ?? "Bounty not found");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchBounty();
    const interval = setInterval(fetchBounty, 8000);
    return () => clearInterval(interval);
  }, [fetchBounty]);

  async function handleClaim() {
    if (!address || !bounty) return;
    setBusy(true);
    const res = await api.bounties.claim(bounty.id, address);
    if (res.success && res.data) {
      setBounty(res.data);
      showToast("Bounty claimed! Submit your PR when ready.");
    } else {
      showToast(res.error ?? "Claim failed", false);
    }
    setBusy(false);
  }

  async function handleSubmitPR() {
    if (!address || !bounty || !prUrl.trim()) return;
    setBusy(true);
    const res = await api.bounties.submitPR(bounty.id, prUrl.trim(), address);
    if (res.success && res.data) {
      setBounty(res.data);
      showToast("PR submitted! Awaiting CI verification.");
      setPrUrl("");
    } else {
      showToast(res.error ?? "PR submission failed", false);
    }
    setBusy(false);
  }

  async function handleSimulateCI(result: "success" | "failure") {
    if (!bounty) return;
    setBusy(true);
    const res = await api.webhook.simulate(bounty.id, result);
    if ((res as any).ok) {
      showToast(
        result === "success"
          ? "✅ CI passed — escrow released to developer!"
          : "❌ CI failed — escrow refunded to agent.",
        result === "success"
      );
      await fetchBounty();
    } else {
      showToast("Simulation failed", false);
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-neon text-xs font-mono animate-pulse">
          loading escrow state...
        </div>
      </div>
    );
  }

  if (error || !bounty) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-4">
        <div className="text-red text-sm">⚠ {error ?? "Not found"}</div>
        <Link href="/dashboard" className="text-dim text-xs hover:text-neon">
          ← back to bounties
        </Link>
      </div>
    );
  }

  const isClaimant =
    address && bounty.claimedBy?.toLowerCase() === address.toLowerCase();
  const canClaim   = bounty.status === "FUNDED" && isConnected;
  const canPR      = bounty.status === "CLAIMED" && isClaimant;
  const canSimulate =
    ["CLAIMED", "VERIFYING"].includes(bounty.status) && bounty.claimedBy;

  return (
    <div className="min-h-screen bg-void p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 glass px-5 py-3 rounded border text-sm font-mono animate-slide-up max-w-sm ${
            toast.ok
              ? "border-neon/40 text-neon"
              : "border-red/40 text-red"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-dim text-xs hover:text-neon transition-colors mb-6 font-mono"
      >
        ← bounty board
      </Link>

      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="text-dim text-xs font-mono mb-1 tracking-wider">{bounty.id}</div>
              <h1 className="font-display text-bright text-2xl font-bold leading-tight">
                {bounty.title}
              </h1>
            </div>
            <StatusBadge status={bounty.status} size="lg" />
          </div>
        </div>

        {/* Escrow lifecycle */}
        <div className="glass rounded-lg p-5 mb-5">
          <div className="text-dim text-[10px] tracking-widest mb-4">
            // ESCROW LIFECYCLE
          </div>
          <EscrowLifecycle status={bounty.status} />

          {/* Escrow metadata */}
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {[
              { label: "escrow address", value: bounty.escrowAddress ? truncateAddr(bounty.escrowAddress) : "pending" },
              { label: "reward",         value: `${bounty.rewardEth} ETH`, highlight: true },
              { label: "deadline",       value: formatDistanceToNow(bounty.deadline, { addSuffix: true }) },
              { label: "tx hash",        value: bounty.txHash ? truncateAddr(bounty.txHash) : "—" },
            ].map(({ label, value, highlight }) => (
              <div key={label}>
                <div className="text-dim text-[10px] tracking-widest mb-0.5">{label}</div>
                <div className={`font-mono ${highlight ? "text-amber font-bold" : "text-muted"}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Task description */}
          <div className="glass rounded-lg p-5">
            <div className="text-dim text-[10px] tracking-widest mb-3">
              // TASK DESCRIPTION
            </div>
            <p className="text-body text-sm leading-relaxed">{bounty.description}</p>

            <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs">
              <div>
                <span className="text-dim">repo: </span>
                <a
                  href={bounty.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue hover:text-neon transition-colors truncate"
                >
                  {bounty.repositoryUrl}
                </a>
              </div>
              <div>
                <span className="text-dim">test cmd: </span>
                <code className="text-neon bg-neon/10 px-1.5 py-0.5 rounded">
                  {bounty.testCommand}
                </code>
              </div>
              <div>
                <span className="text-dim">deadline: </span>
                <span className="text-muted">
                  {format(bounty.deadline, "PPp")}
                </span>
              </div>
              {bounty.prUrl && (
                <div>
                  <span className="text-dim">PR: </span>
                  <a
                    href={bounty.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue hover:text-neon transition-colors"
                  >
                    {bounty.prUrl}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Atlas reasoning */}
          <div className="glass rounded-lg p-5 border-l-2 border-neon/30">
            <div className="text-dim text-[10px] tracking-widest mb-3">
              // ATLAS REASONING
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-neon text-lg">◎</span>
              <span className="text-neon text-xs font-bold">ATLAS v1</span>
              <span className="text-dim text-xs">// AI agent</span>
            </div>
            <p className="text-body/90 text-sm leading-relaxed italic">
              "{bounty.agentReasoning}"
            </p>
            <div className="mt-4 pt-3 border-t border-border text-xs">
              <span className="text-dim">funded by: </span>
              <span className="text-muted font-mono">
                {truncateAddr(bounty.agentWallet)}
              </span>
            </div>
          </div>
        </div>

        {/* Claimant info */}
        {bounty.claimedBy && (
          <div className="glass rounded-lg p-4 mb-5 flex items-center gap-3">
            <span className="text-amber">◉</span>
            <div className="text-xs">
              <span className="text-dim">claimed by: </span>
              <span className="text-amber font-mono">{truncateAddr(bounty.claimedBy)}</span>
            </div>
          </div>
        )}

        {/* Actions panel */}
        <div className="glass rounded-lg p-5">
          <div className="text-dim text-[10px] tracking-widest mb-4">
            // ACTIONS
          </div>

          {!isConnected ? (
            <div className="text-center py-4">
              <p className="text-muted text-xs mb-3">
                Connect your wallet to interact with this bounty
              </p>
              <ConnectButton />
            </div>
          ) : canClaim ? (
            <div>
              <p className="text-muted text-xs mb-3">
                Claim this bounty to start working. Your wallet will be registered as the recipient.
              </p>
              <button
                onClick={handleClaim}
                disabled={busy}
                className="bg-neon text-void font-bold px-6 py-2.5 rounded text-sm tracking-widest hover:bg-neon/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(0,255,148,0.4)]"
              >
                {busy ? "CLAIMING..." : "⊕ CLAIM BOUNTY"}
              </button>
            </div>
          ) : canPR ? (
            <div>
              <p className="text-muted text-xs mb-3">
                Submit your pull request URL. GitHub Actions will run{" "}
                <code className="text-neon bg-neon/10 px-1 rounded">
                  {bounty.testCommand}
                </code>{" "}
                and release escrow automatically if tests pass.
              </p>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/org/repo/pull/42"
                  className="flex-1 bg-void border border-border rounded px-3 py-2 text-xs font-mono text-bright placeholder-dim focus:outline-none focus:border-neon/40"
                />
                <button
                  onClick={handleSubmitPR}
                  disabled={busy || !prUrl.trim()}
                  className="bg-amber text-void font-bold px-5 py-2 rounded text-xs tracking-widest hover:bg-amber/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "..." : "SUBMIT PR"}
                </button>
              </div>
            </div>
          ) : null}

          {/* Demo CI simulator — always show when applicable */}
          {canSimulate && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-dim text-[10px] tracking-widest mb-2">
                // DEMO: SIMULATE CI RESULT
              </div>
              <p className="text-dim text-xs mb-3">
                Simulate a GitHub Actions outcome to trigger escrow release or refund.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSimulateCI("success")}
                  disabled={busy}
                  className="flex-1 border border-neon/30 bg-neon/10 text-neon font-bold px-4 py-2 rounded text-xs tracking-widest hover:bg-neon/20 transition-all disabled:opacity-50"
                >
                  {busy ? "..." : "✓ CI PASS → RELEASE"}
                </button>
                <button
                  onClick={() => handleSimulateCI("failure")}
                  disabled={busy}
                  className="flex-1 border border-red/30 bg-red/10 text-red font-bold px-4 py-2 rounded text-xs tracking-widest hover:bg-red/20 transition-all disabled:opacity-50"
                >
                  {busy ? "..." : "✗ CI FAIL → REFUND"}
                </button>
              </div>
            </div>
          )}

          {/* Terminal state messages */}
          {bounty.status === "RELEASED" && (
            <div className="text-center py-4">
              <div className="text-neon text-2xl mb-2">✓</div>
              <div className="text-neon font-bold text-sm tracking-widest">FUNDS RELEASED</div>
              <div className="text-muted text-xs mt-1">
                {bounty.rewardEth} ETH sent to{" "}
                {bounty.claimedBy ? truncateAddr(bounty.claimedBy) : "developer"}
              </div>
              {bounty.txHash && (
                <div className="text-dim text-xs mt-1 font-mono">{bounty.txHash}</div>
              )}
            </div>
          )}
          {bounty.status === "REFUNDED" && (
            <div className="text-center py-4">
              <div className="text-red text-2xl mb-2">⟲</div>
              <div className="text-red font-bold text-sm tracking-widest">REFUNDED TO AGENT</div>
              <div className="text-muted text-xs mt-1">CI tests did not pass</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}