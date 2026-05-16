"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import clsx from "clsx";

const NAV = [
  { href: "/",          label: "// home",      icon: "◈" },
  { href: "/dashboard", label: "// bounties",  icon: "◉" },
  { href: "/agent",     label: "// atlas",     icon: "◎" },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-neon text-lg">⬡</span>
          <span className="font-display text-bright text-sm font-bold tracking-widest">
            AGENT<span className="text-neon">BOUNTY</span>
          </span>
        </div>
        <p className="text-dim text-xs mt-1">v0.1.0 // sepolia</p>
      </div>

      {/* Status bar */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="status-dot funded" />
          <span className="text-xs text-muted">atlas online</span>
        </div>
        <div className="text-xs text-dim mt-1 font-mono">
          network: <span className="text-amber">sepolia</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active =
            href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-150",
                active
                  ? "bg-neon/10 text-neon border border-neon/20"
                  : "text-muted hover:text-bright hover:bg-panel border border-transparent"
              )}
            >
              <span className={clsx("text-base", active && "glow-neon")}>
                {icon}
              </span>
              <span className="font-mono">{label}</span>
              {active && (
                <span className="ml-auto text-neon text-xs">▶</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Wallet connect */}
      <div className="px-4 pb-4 pt-2 border-t border-border">
        <p className="text-dim text-xs mb-2 px-1">// wallet</p>
        <div className="scale-[0.92] origin-left">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-4 text-xs text-dim">
        <div>powered by</div>
        <div className="text-muted">trustless.work × claude</div>
      </div>
    </aside>
  );
}