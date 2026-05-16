import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { store } from "../db/store";
import { createAndFundEscrow } from "../services/escrow";
import { generateDemoBounty, generateBountyFromContext } from "../services/agent";
import { Bounty, CreateBountyInput, ApiResponse } from "../types";
import { parseEther } from "viem";

export const bountyRouter = Router();

// ── GET /bounties ─────────────────────────────────────────────────────────
// Returns all bounties, most recent first.

bountyRouter.get("/", (_req: Request, res: Response) => {
  const bounties = store.getAll();
  const response: ApiResponse<Bounty[]> = { success: true, data: bounties };
  res.json(response);
});

// ── GET /bounties/:id ─────────────────────────────────────────────────────

bountyRouter.get("/:id", (req: Request, res: Response) => {
  const bounty = store.getById(req.params.id);
  if (!bounty) {
    res.status(404).json({ success: false, error: "Bounty not found" });
    return;
  }
  res.json({ success: true, data: bounty });
});

// ── POST /bounties ────────────────────────────────────────────────────────
// Creates a bounty and funds the escrow.
// Called either by the AI agent automatically or by a human via the UI.

bountyRouter.post("/", async (req: Request, res: Response) => {
  const body = req.body as CreateBountyInput;

  // Basic validation
  const missing = (
    ["title", "description", "rewardEth", "repositoryUrl", "testCommand", "deadlineHours"] as const
  ).filter((f) => !body[f]);

  if (missing.length > 0) {
    res.status(400).json({
      success: false,
      error: `Missing fields: ${missing.join(", ")}`,
    });
    return;
  }

  const agentWallet = process.env.AGENT_WALLET_ADDRESS ?? "0xDemoAgent";
  const now = Date.now();
  const deadlineTimestamp = now + body.deadlineHours * 60 * 60 * 1000;
  const bountyId = `bounty-${uuidv4().slice(0, 8)}`;

  // Build the bounty record first (optimistic — update with escrow data after)
  const bounty: Bounty = {
    id: bountyId,
    title: body.title,
    description: body.description,
    agentReasoning: body.agentReasoning ?? "Manually created bounty.",
    rewardEth: body.rewardEth,
    rewardWei: parseEther(body.rewardEth as `${number}`).toString(),
    status: "FUNDED",
    repositoryUrl: body.repositoryUrl,
    testCommand: body.testCommand,
    deadline: deadlineTimestamp,
    createdAt: now,
    updatedAt: now,
    agentWallet,
  };

  store.create(bounty);

  // Attempt to fund escrow (non-blocking for demo if TW API key not set)
  try {
    if (process.env.TRUSTLESS_WORK_API_KEY) {
      const escrow = await createAndFundEscrow({
        bountyId,
        agentWallet,
        developerWallet: "0x0000000000000000000000000000000000000000", // set on claim
        amountEth: body.rewardEth,
        deadlineTimestamp,
      });
      store.update(bountyId, {
        escrowAddress: escrow.escrowAddress,
        escrowId: escrow.escrowId,
        txHash: escrow.txHash,
      });
    } else {
      // Demo mode — simulate escrow address
      store.update(bountyId, {
        escrowAddress: `0xDemoEscrow${bountyId.slice(-6)}`,
        escrowId: `demo-${bountyId}`,
      });
    }
  } catch (err) {
    console.error("[bounty] Escrow funding failed:", err);
    // Don't fail the request — bounty is still visible in demo
  }

  const saved = store.getById(bountyId)!;
  res.status(201).json({ success: true, data: saved });
});

// ── POST /bounties/:id/claim ──────────────────────────────────────────────
// Developer claims a bounty. Records their wallet address.

bountyRouter.post("/:id/claim", async (req: Request, res: Response) => {
  const { developerWallet } = req.body as { developerWallet: string };
  const bounty = store.getById(req.params.id);

  if (!bounty) {
    res.status(404).json({ success: false, error: "Bounty not found" });
    return;
  }
  if (bounty.status !== "FUNDED") {
    res.status(409).json({
      success: false,
      error: `Bounty is not claimable. Current status: ${bounty.status}`,
    });
    return;
  }
  if (!developerWallet) {
    res.status(400).json({ success: false, error: "developerWallet required" });
    return;
  }

  const updated = store.update(bounty.id, {
    status: "CLAIMED",
    claimedBy: developerWallet,
  });

  res.json({ success: true, data: updated });
});

// ── POST /bounties/:id/submit-pr ──────────────────────────────────────────
// Developer submits their PR URL. Status moves to VERIFYING.

bountyRouter.post("/:id/submit-pr", (req: Request, res: Response) => {
  const { prUrl, developerWallet } = req.body as {
    prUrl: string;
    developerWallet: string;
  };
  const bounty = store.getById(req.params.id);

  if (!bounty) {
    res.status(404).json({ success: false, error: "Bounty not found" });
    return;
  }
  if (bounty.status !== "CLAIMED") {
    res.status(409).json({
      success: false,
      error: `Cannot submit PR. Current status: ${bounty.status}`,
    });
    return;
  }
  if (bounty.claimedBy?.toLowerCase() !== developerWallet?.toLowerCase()) {
    res.status(403).json({ success: false, error: "Not the bounty claimant" });
    return;
  }

  // Index the PR URL for webhook lookup
  store.indexPR(prUrl, bounty.id);

  const updated = store.update(bounty.id, {
    status: "VERIFYING",
    prUrl,
  });

  res.json({ success: true, data: updated });
});

// ── POST /bounties/agent/generate ─────────────────────────────────────────
// Triggers Atlas to generate and post a new bounty autonomously.

bountyRouter.post("/agent/generate", async (req: Request, res: Response) => {
  const { repositoryUrl, recentCommits, openIssues, existingTests } = req.body;

  if (!repositoryUrl) {
    res.status(400).json({ success: false, error: "repositoryUrl required" });
    return;
  }

  try {
    let bountyInput: CreateBountyInput;

    if (recentCommits || openIssues || existingTests) {
      bountyInput = await generateBountyFromContext({
        repositoryUrl,
        recentCommits,
        openIssues,
        existingTests,
      });
    } else {
      bountyInput = await generateDemoBounty(repositoryUrl);
    }

    // Self-post the generated bounty
    const agentWallet = process.env.AGENT_WALLET_ADDRESS ?? "0xAtlasAgent";
    const now = Date.now();
    const deadlineTimestamp =
      now + (bountyInput.deadlineHours ?? 48) * 60 * 60 * 1000;
    const bountyId = `bounty-${uuidv4().slice(0, 8)}`;

    const bounty: Bounty = {
      id: bountyId,
      title: bountyInput.title,
      description: bountyInput.description,
      agentReasoning: bountyInput.agentReasoning,
      rewardEth: bountyInput.rewardEth,
      rewardWei: parseEther(bountyInput.rewardEth as `${number}`).toString(),
      status: "FUNDED",
      repositoryUrl: bountyInput.repositoryUrl,
      testCommand: bountyInput.testCommand,
      deadline: deadlineTimestamp,
      createdAt: now,
      updatedAt: now,
      agentWallet,
      escrowAddress: `0xAtlasEscrow${bountyId.slice(-6)}`,
      escrowId: `atlas-${bountyId}`,
    };

    store.create(bounty);
    res.status(201).json({ success: true, data: bounty });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Agent generation failed";
    res.status(500).json({ success: false, error: msg });
  }
});