export type EscrowStatus =
  | "FUNDED"
  | "CLAIMED"
  | "VERIFYING"
  | "RELEASED"
  | "REFUNDED"
  | "DISPUTED";

export interface Bounty {
  id: string;
  title: string;
  description: string;
  agentReasoning: string;
  rewardEth: string;           // e.g. "0.05"
  rewardWei: string;           // bigint as string
  status: EscrowStatus;
  escrowAddress?: string;      // Trustless Work escrow contract address
  escrowId?: string;           // Trustless Work internal ID
  claimedBy?: string;          // developer wallet address
  prUrl?: string;              // GitHub PR link
  repositoryUrl: string;
  testCommand: string;         // e.g. "npm test"
  deadline: number;            // Unix timestamp
  createdAt: number;
  updatedAt: number;
  agentWallet: string;         // funder address
  txHash?: string;             // funding tx hash
}

export interface CreateBountyInput {
  title: string;
  description: string;
  agentReasoning: string;
  rewardEth: string;
  repositoryUrl: string;
  testCommand: string;
  deadlineHours: number;       // hours from now
}

export interface ClaimBountyInput {
  bountyId: string;
  developerWallet: string;
}

export interface WebhookPayload {
  action: string;
  workflow_run?: {
    id: number;
    name: string;
    conclusion: "success" | "failure" | "cancelled" | "timed_out" | null;
    head_branch: string;
    head_sha: string;
    pull_requests: Array<{
      id: number;
      number: number;
      url: string;
    }>;
  };
  check_run?: {
    id: number;
    name: string;
    conclusion: string;
    check_suite: {
      id: number;
    };
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

export interface EscrowCreateParams {
  bountyId: string;
  agentWallet: string;
  developerWallet: string;
  arbitratorWallet: string;
  amountEth: string;
  platformFeeBps?: number;     // basis points e.g. 100 = 1%
}

export interface AgentTaskContext {
  repositoryUrl: string;
  recentCommits?: string[];
  openIssues?: string[];
  existingTests?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}