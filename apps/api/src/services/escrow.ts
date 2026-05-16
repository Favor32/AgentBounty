import axios from "axios";

const TW_API_URL =
  process.env.TRUSTLESS_WORK_API_URL ?? "https://api.trustlesswork.com";
const TW_API_KEY = process.env.TRUSTLESS_WORK_API_KEY ?? "";

// Arbitrator wallet — in production this would be a DAO or multisig.
// For MVP, use a second wallet you control.
const ARBITRATOR_WALLET =
  process.env.ARBITRATOR_WALLET_ADDRESS ??
  process.env.AGENT_WALLET_ADDRESS ??
  "";

const twClient = axios.create({
  baseURL: TW_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TW_API_KEY}`,
  },
  timeout: 30_000,
});

// ── Types ─────────────────────────────────────────────────────────────────

export interface EscrowCreateResult {
  escrowId: string;
  escrowAddress: string;
  txHash: string;
}

export interface EscrowState {
  escrowId: string;
  status: string;
  balance: string;
  funder: string;
  recipient: string;
  arbitrator: string;
  deadline: number;
}

// ── Helper: log TW API errors cleanly ────────────────────────────────────

function handleTWError(error: unknown, context: string): never {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message ?? error.message;
    throw new Error(`[TW escrow] ${context}: ${msg}`);
  }
  throw error;
}

// ── Core escrow operations ────────────────────────────────────────────────

/**
 * Creates and funds a new escrow for a bounty.
 * Called by the AI agent when posting a new bounty.
 *
 * Trustless Work flow:
 *   1. POST /escrows → creates escrow contract
 *   2. The agent wallet funds it via the returned escrowAddress
 *
 * For MVP we use the TW API's "initialize and fund" combined endpoint.
 */
export async function createAndFundEscrow(params: {
  bountyId: string;
  agentWallet: string;
  developerWallet: string;
  amountEth: string;
  deadlineTimestamp: number;
}): Promise<EscrowCreateResult> {
  const { bountyId, agentWallet, developerWallet, amountEth, deadlineTimestamp } =
    params;

  try {
    // Step 1: Initialize escrow via TW API
    const initRes = await twClient.post("/escrows", {
      title: `AgentBounty: ${bountyId}`,
      description: `Automated bounty escrow for task ${bountyId}`,
      client: agentWallet,           // payer / funder (AI agent)
      serviceProvider: developerWallet, // recipient (developer)
      arbitrator: ARBITRATOR_WALLET,
      amount: amountEth,
      deadline: deadlineTimestamp,
      platformFee: "100",            // 1% platform fee in basis points
      metadata: JSON.stringify({ bountyId, platform: "agentbounty" }),
    });

    const { id: escrowId, contractAddress: escrowAddress } = initRes.data;

    // Step 2: Fund the escrow (agent wallet signs via TW backend signer)
    const fundRes = await twClient.post(`/escrows/${escrowId}/fund`, {
      senderWallet: agentWallet,
    });

    return {
      escrowId,
      escrowAddress,
      txHash: fundRes.data.txHash,
    };
  } catch (err) {
    handleTWError(err, "createAndFundEscrow");
  }
}

/**
 * Releases funds to the developer.
 * Called automatically when GitHub CI tests pass.
 */
export async function releaseFunds(escrowId: string): Promise<string> {
  try {
    const res = await twClient.post(`/escrows/${escrowId}/release`, {
      callerWallet: process.env.AGENT_WALLET_ADDRESS,
    });
    return res.data.txHash as string;
  } catch (err) {
    handleTWError(err, "releaseFunds");
  }
}

/**
 * Refunds the agent when CI fails or deadline expires.
 */
export async function refundFunds(escrowId: string): Promise<string> {
  try {
    const res = await twClient.post(`/escrows/${escrowId}/refund`, {
      callerWallet: process.env.AGENT_WALLET_ADDRESS,
    });
    return res.data.txHash as string;
  } catch (err) {
    handleTWError(err, "refundFunds");
  }
}

/**
 * Raises a dispute — sends to arbitrator.
 */
export async function raiseDispute(
  escrowId: string,
  reason: string
): Promise<void> {
  try {
    await twClient.post(`/escrows/${escrowId}/dispute`, {
      reason,
      callerWallet: process.env.AGENT_WALLET_ADDRESS,
    });
  } catch (err) {
    handleTWError(err, "raiseDispute");
  }
}

/**
 * Fetches current on-chain escrow state for display.
 */
export async function getEscrowState(escrowId: string): Promise<EscrowState> {
  try {
    const res = await twClient.get(`/escrows/${escrowId}`);
    return res.data as EscrowState;
  } catch (err) {
    handleTWError(err, "getEscrowState");
  }
}

/**
 * Deadline checker — called by a cron or on every status poll.
 * If the escrow is past deadline and still CLAIMED/VERIFYING → refund.
 */
export async function checkAndRefundExpired(
  escrowId: string,
  deadlineTimestamp: number
): Promise<boolean> {
  if (Date.now() < deadlineTimestamp) return false;

  try {
    const state = await getEscrowState(escrowId);
    if (["FUNDED", "CLAIMED", "VERIFYING"].includes(state.status)) {
      await refundFunds(escrowId);
      return true;
    }
  } catch {
    // If TW API is down, don't crash — just log
    console.error(`[escrow] Failed deadline check for ${escrowId}`);
  }
  return false;
}