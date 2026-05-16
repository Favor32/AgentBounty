"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";
import { StatusBadge } from "./EscrowStatus";
import type { Bounty } from "@/types";

function truncateAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function deadlineColor(deadline: number, status: string) {
  if (["RELEASED", "REFUNDED", "DISPUTED"].includes(status)) return "text-dim";
  const hoursLeft = (deadline - Date.now()) / 3600000;
  if (hoursLeft < 4)  return "text-red";
  if (hoursLeft < 12) return "text-amber";
  return "text-muted";
}

export function BountyCard({ bounty, index = 0 }: { bounty: Bounty; index?: number }) {
  const isPast = Date.now() > bounty.deadline;

  return (
    <Link href={`/bounty/${bounty.id}`} className="block group">
      <div
        className={clsx(
          "glass rounded-lg p-5 transition-all duration-200 animate-slide-up",
          "hover:border-neon/30 hover:bg-neon/[0.02]",
          "relative overflow-hidden cursor-pointer"
        )}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute top-0 right-0 w-0 h-0 border-l-[48px] border-l-transparent border-t-[48px] border-neon/10" />
        </div>

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="text-dim text-xs font-mono mb-1 tracking-wider">
              {bounty.id}
            </div>
            <h3 className="text-bright text-sm font-bold leading-snug line-clamp-2 group-hover:text-neon transition-colors duration-150">
              {bounty.title}
            </h3>
          </div>
          <StatusBadge status={bounty.status} />
        </div>

        {/* Description */}
        <p className="text-muted text-xs leading-relaxed line-clamp-2 mb-4">
          {bounty.description}
        </p>

        {/* Agent reasoning pill */}
        <div className="bg-neon/5 border border-neon/10 rounded px-3 py-2 mb-4">
          <div className="text-dim text-[10px] tracking-widest mb-0.5">// ATLAS</div>
          <p className="text-neon/80 text-xs leading-relaxed line-clamp-1">
            {bounty.agentReasoning}
          </p>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            {/* Reward */}
            <div>
              <span className="text-dim text-[10px] block">reward</span>
              <span className="text-amber font-bold glow-amber">
                {bounty.rewardEth} ETH
              </span>
            </div>
            {/* Deadline */}
            <div>
              <span className="text-dim text-[10px] block">deadline</span>
              <span className={clsx("font-mono", deadlineColor(bounty.deadline, bounty.status))}>
                {isPast
                  ? "expired"
                  : formatDistanceToNow(bounty.deadline, { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Claimer */}
          <div className="text-right">
            <span className="text-dim text-[10px] block">
              {bounty.claimedBy ? "claimant" : "unclaimed"}
            </span>
            <span className="text-muted font-mono">
              {bounty.claimedBy ? truncateAddr(bounty.claimedBy) : "—"}
            </span>
          </div>
        </div>

        {/* Bottom status line */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-dim text-[10px] font-mono">
            {bounty.escrowAddress ? truncateAddr(bounty.escrowAddress) : "escrow pending"}
          </span>
          <span className="text-dim text-[10px] group-hover:text-neon transition-colors">
            view details →
          </span>
        </div>
      </div>
    </Link>
  );
}