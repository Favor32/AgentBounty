import { Router, Request, Response } from "express";
import { store } from "../db/store";
import { releaseFunds, refundFunds } from "../services/escrow";
import { verifyGitHubSignature, parseCIResult, normalizePRUrl } from "../services/github";
import { WebhookPayload } from "../types";

export const webhookRouter = Router();

// ── POST /webhook/github ──────────────────────────────────────────────────
//
// GitHub sends this when:
//   - A workflow_run completes (GitHub Actions)
//   - A check_run completes
//
// Flow:
//   1. Verify signature
//   2. Parse CI result (pass/fail)
//   3. Find matching bounty via PR URL
//   4. Release or refund escrow

webhookRouter.post("/github", async (req: Request, res: Response) => {
  // ── Step 1: Verify GitHub signature ──────────────────────────────────
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const rawBody: Buffer = (req as any).rawBody;

  if (!verifyGitHubSignature(rawBody, signature)) {
    console.warn("[webhook] Invalid signature — rejecting request");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const event = req.headers["x-github-event"] as string;
  const payload = req.body as WebhookPayload;

  console.log(`[webhook] Received event: ${event}, action: ${payload.action}`);

  // Only process workflow_run or check_run completed events
  if (!["workflow_run", "check_run"].includes(event)) {
    res.json({ ok: true, message: "Event ignored" });
    return;
  }

  // ── Step 2: Parse CI result ───────────────────────────────────────────
  const ciResult = parseCIResult(payload);

  if (!ciResult) {
    res.json({ ok: true, message: "Not a CI completion event" });
    return;
  }

  if (ciResult.conclusion === null) {
    // CI is still running (e.g. skipped, neutral) — wait for next event
    res.json({ ok: true, message: "CI not yet conclusive" });
    return;
  }

  console.log(
    `[webhook] CI result: ${ciResult.conclusion} | repo: ${ciResult.repoUrl}`
  );

  // ── Step 3: Find matching bounty ──────────────────────────────────────
  let bounty = null;

  // Try PR URL lookup first (most precise)
  for (const prUrl of ciResult.prUrls) {
    const normalized = normalizePRUrl(prUrl);
    bounty = store.getBountyByPR(normalized);
    if (bounty) break;
  }

  // Fallback: find any VERIFYING bounty for this repo
  if (!bounty) {
    const repoBounties = store.getBountiesByRepo(ciResult.repoUrl);
    bounty = repoBounties.find((b) => b.status === "VERIFYING") ?? null;
  }

  if (!bounty) {
    console.log("[webhook] No matching bounty found for this CI event");
    res.json({ ok: true, message: "No matching bounty" });
    return;
  }

  if (!["CLAIMED", "VERIFYING"].includes(bounty.status)) {
    console.log(
      `[webhook] Bounty ${bounty.id} is in status ${bounty.status} — skipping`
    );
    res.json({ ok: true, message: "Bounty not in actionable state" });
    return;
  }

  console.log(
    `[webhook] Processing bounty ${bounty.id} — CI: ${ciResult.conclusion}`
  );

  // ── Step 4: Release or refund ─────────────────────────────────────────
  try {
    if (ciResult.conclusion === "success") {
      // ✅ Tests passed → release funds to developer
      let txHash: string | undefined;

      if (bounty.escrowId && process.env.TRUSTLESS_WORK_API_KEY) {
        txHash = await releaseFunds(bounty.escrowId);
      } else {
        // Demo mode — simulate
        txHash = `0xDemoRelease${bounty.id.slice(-8)}${Date.now()}`;
        console.log("[webhook] Demo mode: simulating fund release");
      }

      store.update(bounty.id, {
        status: "RELEASED",
        txHash,
      });

      console.log(
        `[webhook] ✅ Bounty ${bounty.id} RELEASED to ${bounty.claimedBy} | tx: ${txHash}`
      );

      res.json({
        ok: true,
        action: "RELEASED",
        bountyId: bounty.id,
        recipient: bounty.claimedBy,
        txHash,
      });
    } else {
      // ❌ Tests failed → refund agent
      let txHash: string | undefined;

      if (bounty.escrowId && process.env.TRUSTLESS_WORK_API_KEY) {
        txHash = await refundFunds(bounty.escrowId);
      } else {
        txHash = `0xDemoRefund${bounty.id.slice(-8)}${Date.now()}`;
        console.log("[webhook] Demo mode: simulating refund");
      }

      store.update(bounty.id, {
        status: "REFUNDED",
        txHash,
      });

      console.log(
        `[webhook] ❌ Bounty ${bounty.id} REFUNDED to ${bounty.agentWallet} | tx: ${txHash}`
      );

      res.json({
        ok: true,
        action: "REFUNDED",
        bountyId: bounty.id,
        refundTo: bounty.agentWallet,
        txHash,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Escrow action failed";
    console.error(`[webhook] Escrow error for bounty ${bounty.id}:`, msg);

    // Mark as disputed so it can be manually resolved
    store.updateStatus(bounty.id, "DISPUTED");

    res.status(500).json({
      ok: false,
      error: msg,
      bountyId: bounty.id,
      note: "Bounty marked DISPUTED — manual resolution required",
    });
  }
});

// ── POST /webhook/simulate ────────────────────────────────────────────────
// Demo-only endpoint to simulate a CI pass/fail without a real GitHub webhook.
// Remove this in production.

webhookRouter.post("/simulate", async (req: Request, res: Response) => {
  const { bountyId, result } = req.body as {
    bountyId: string;
    result: "success" | "failure";
  };

  const bounty = store.getById(bountyId);
  if (!bounty) {
    res.status(404).json({ success: false, error: "Bounty not found" });
    return;
  }

  if (!["CLAIMED", "VERIFYING"].includes(bounty.status)) {
    res.status(409).json({
      success: false,
      error: `Cannot simulate on status: ${bounty.status}`,
    });
    return;
  }

  // Move to VERIFYING first if still CLAIMED
  if (bounty.status === "CLAIMED") {
    store.updateStatus(bountyId, "VERIFYING");
  }

  const txHash = `0xSimulated${result}${Date.now()}`;

  if (result === "success") {
    store.update(bountyId, { status: "RELEASED", txHash });
  } else {
    store.update(bountyId, { status: "REFUNDED", txHash });
  }

  res.json({
    ok: true,
    action: result === "success" ? "RELEASED" : "REFUNDED",
    bountyId,
    txHash,
    note: "Simulated — not a real on-chain transaction",
  });
});