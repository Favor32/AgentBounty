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
  rewardEth: string;
  rewardWei: string;
  status: EscrowStatus;
  escrowAddress?: string;
  escrowId?: string;
  claimedBy?: string;
  prUrl?: string;
  repositoryUrl: string;
  testCommand: string;
  deadline: number;
  createdAt: number;
  updatedAt: number;
  agentWallet: string;
  txHash?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}