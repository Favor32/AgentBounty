import { Bounty, EscrowStatus } from "../types";

// In-memory store — MVP only. Replace with Postgres/Supabase post-hackathon.
const bounties = new Map<string, Bounty>();

// Index: PR URL → bountyId (for webhook lookup)
const prToBounty = new Map<string, string>();

// Index: repoFullName → bountyId[] (for webhook lookup by repo)
const repoToBounties = new Map<string, string[]>();

export const store = {
  // ── Bounty CRUD ──────────────────────────────────────────────────────────

  create(bounty: Bounty): Bounty {
    bounties.set(bounty.id, bounty);
    // Index by repo
    const existing = repoToBounties.get(bounty.repositoryUrl) ?? [];
    repoToBounties.set(bounty.repositoryUrl, [...existing, bounty.id]);
    return bounty;
  },

  getById(id: string): Bounty | undefined {
    return bounties.get(id);
  },

  getAll(): Bounty[] {
    return Array.from(bounties.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },

  getByStatus(status: EscrowStatus): Bounty[] {
    return this.getAll().filter((b) => b.status === status);
  },

  update(id: string, patch: Partial<Bounty>): Bounty | undefined {
    const existing = bounties.get(id);
    if (!existing) return undefined;
    const updated: Bounty = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };
    bounties.set(id, updated);
    return updated;
  },

  updateStatus(id: string, status: EscrowStatus): Bounty | undefined {
    return this.update(id, { status });
  },

  // ── PR index ─────────────────────────────────────────────────────────────

  indexPR(prUrl: string, bountyId: string): void {
    prToBounty.set(prUrl, bountyId);
  },

  getBountyByPR(prUrl: string): Bounty | undefined {
    const id = prToBounty.get(prUrl);
    return id ? bounties.get(id) : undefined;
  },

  getBountiesByRepo(repoUrl: string): Bounty[] {
    const ids = repoToBounties.get(repoUrl) ?? [];
    return ids.map((id) => bounties.get(id)).filter(Boolean) as Bounty[];
  },

  // ── Seed data (demo/judge mode) ───────────────────────────────────────────

  seed(): void {
    if (bounties.size > 0) return; // Only seed once

    const now = Date.now();
    const seeds: Bounty[] = [
      {
        id: "bounty-demo-1",
        title: "Add authentication middleware tests",
        description:
          "The /api/auth routes are missing unit tests. Add Jest tests covering login, logout, token refresh, and invalid token rejection. Minimum 80% coverage required.",
        agentReasoning:
          "Atlas detected that src/middleware/auth.ts has 0% test coverage and is a critical security surface. A 0.05 ETH bounty was created to incentivize immediate remediation.",
        rewardEth: "0.05",
        rewardWei: "50000000000000000",
        status: "FUNDED",
        repositoryUrl: "https://github.com/demo-org/demo-repo",
        testCommand: "npm test -- --coverage",
        deadline: now + 48 * 60 * 60 * 1000,
        createdAt: now - 3600000,
        updatedAt: now - 3600000,
        agentWallet: "0xAtlasAgentWalletDemo",
        escrowAddress: "0xDemoEscrow1",
      },
      {
        id: "bounty-demo-2",
        title: "Fix race condition in WebSocket handler",
        description:
          "Under concurrent connections, the WebSocket event emitter fires duplicate 'disconnect' events. Reproduce with the provided load test script and patch the handler.",
        agentReasoning:
          "Atlas observed 47 duplicate disconnect errors in production logs over 24 hours. Created a 0.08 ETH bounty to resolve this before the next release.",
        rewardEth: "0.08",
        rewardWei: "80000000000000000",
        status: "CLAIMED",
        claimedBy: "0xDevWallet123",
        repositoryUrl: "https://github.com/demo-org/demo-repo",
        testCommand: "npm test",
        deadline: now + 24 * 60 * 60 * 1000,
        createdAt: now - 7200000,
        updatedAt: now - 1800000,
        agentWallet: "0xAtlasAgentWalletDemo",
        escrowAddress: "0xDemoEscrow2",
      },
      {
        id: "bounty-demo-3",
        title: "Implement rate limiting on public API endpoints",
        description:
          "Public endpoints /api/search and /api/feed have no rate limiting. Implement express-rate-limit with Redis backing. Write integration tests.",
        agentReasoning:
          "Atlas detected an 800% spike in /api/search requests from a single IP range over 6 hours — a likely scraping attack. Created a 0.12 ETH bounty to add rate limiting.",
        rewardEth: "0.12",
        rewardWei: "120000000000000000",
        status: "VERIFYING",
        claimedBy: "0xDevWallet456",
        prUrl: "https://github.com/demo-org/demo-repo/pull/42",
        repositoryUrl: "https://github.com/demo-org/demo-repo",
        testCommand: "npm test",
        deadline: now + 12 * 60 * 60 * 1000,
        createdAt: now - 14400000,
        updatedAt: now - 900000,
        agentWallet: "0xAtlasAgentWalletDemo",
        escrowAddress: "0xDemoEscrow3",
      },
    ];

    seeds.forEach((b) => this.create(b));
    console.log(`[store] Seeded ${seeds.length} demo bounties`);
  },
};