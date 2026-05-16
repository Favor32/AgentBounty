import { Router, Request, Response } from "express";
import { store } from "../db/store";
import { raiseDispute } from "../services/escrow";

export const disputeRouter = Router();

// ── POST /dispute ─────────────────────────────────────────────────────────
// Either party can raise a dispute. Forwards to Trustless Work arbitrator.

disputeRouter.post("/", async (req: Request, res: Response) => {
  const {
    bountyId,
    reason,
    callerWallet,
  }: { bountyId: string; reason: string; callerWallet: string } = req.body;

  if (!bountyId || !reason || !callerWallet) {
    res.status(400).json({
      success: false,
      error: "bountyId, reason, and callerWallet are required",
    });
    return;
  }

  const bounty = store.getById(bountyId);
  if (!bounty) {
    res.status(404).json({ success: false, error: "Bounty not found" });
    return;
  }

  // Only agent or developer can raise a dispute
  const isAgent =
    callerWallet.toLowerCase() === bounty.agentWallet.toLowerCase();
  const isDeveloper =
    bounty.claimedBy &&
    callerWallet.toLowerCase() === bounty.claimedBy.toLowerCase();

  if (!isAgent && !isDeveloper) {
    res.status(403).json({
      success: false,
      error: "Only the bounty funder or claimant can raise a dispute",
    });
    return;
  }

  const allowedStatuses = ["CLAIMED", "VERIFYING", "RELEASED", "REFUNDED"];
  if (!allowedStatuses.includes(bounty.status)) {
    res.status(409).json({
      success: false,
      error: `Cannot dispute bounty in status: ${bounty.status}`,
    });
    return;
  }

  try {
    if (bounty.escrowId && process.env.TRUSTLESS_WORK_API_KEY) {
      await raiseDispute(bounty.escrowId, reason);
    } else {
      console.log(`[dispute] Demo mode: simulating dispute for ${bountyId}`);
    }

    store.updateStatus(bountyId, "DISPUTED");

    res.json({
      success: true,
      message: "Dispute raised — arbitrator notified",
      bountyId,
      status: "DISPUTED",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dispute failed";
    res.status(500).json({ success: false, error: msg });
  }
});