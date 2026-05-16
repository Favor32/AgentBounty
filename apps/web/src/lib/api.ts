import type { Bounty, ApiResponse } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function req<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    return { success: false, error: err.error ?? "Request failed" };
  }
  return res.json();
}

// ── Bounties ──────────────────────────────────────────────────────────────

export const api = {
  bounties: {
    list: () => req<Bounty[]>("/bounties"),

    get: (id: string) => req<Bounty>(`/bounties/${id}`),

    create: (body: {
      title: string;
      description: string;
      agentReasoning: string;
      rewardEth: string;
      repositoryUrl: string;
      testCommand: string;
      deadlineHours: number;
    }) =>
      req<Bounty>("/bounties", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    claim: (bountyId: string, developerWallet: string) =>
      req<Bounty>(`/bounties/${bountyId}/claim`, {
        method: "POST",
        body: JSON.stringify({ developerWallet }),
      }),

    submitPR: (bountyId: string, prUrl: string, developerWallet: string) =>
      req<Bounty>(`/bounties/${bountyId}/submit-pr`, {
        method: "POST",
        body: JSON.stringify({ prUrl, developerWallet }),
      }),

    agentGenerate: (repositoryUrl: string) =>
      req<Bounty>("/bounties/agent/generate", {
        method: "POST",
        body: JSON.stringify({ repositoryUrl }),
      }),
  },

  webhook: {
    simulate: (bountyId: string, result: "success" | "failure") =>
      req(`/webhook/simulate`, {
        method: "POST",
        body: JSON.stringify({ bountyId, result }),
      }),
  },

  dispute: {
    raise: (bountyId: string, reason: string, callerWallet: string) =>
      req("/dispute", {
        method: "POST",
        body: JSON.stringify({ bountyId, reason, callerWallet }),
      }),
  },

  health: () =>
    req<{ status: string; bountyCount: number; env: Record<string, boolean> }>(
      "/health"
    ),
};