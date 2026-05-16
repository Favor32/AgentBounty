import crypto from "crypto";
import { WebhookPayload } from "../types";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? "";

// ── Signature verification ────────────────────────────────────────────────

/**
 * Verifies the X-Hub-Signature-256 header from GitHub.
 * MUST be called before trusting any webhook payload.
 */
export function verifyGitHubSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined
): boolean {
  if (!signatureHeader) return false;
  if (!WEBHOOK_SECRET) {
    console.warn("[github] GITHUB_WEBHOOK_SECRET not set — skipping verification");
    return true; // Dev mode: allow all
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ── Payload parsing ───────────────────────────────────────────────────────

/**
 * Extracts the CI result from a GitHub webhook payload.
 * Handles both workflow_run and check_run event types.
 */
export function parseCIResult(payload: WebhookPayload): {
  conclusion: "success" | "failure" | null;
  prUrls: string[];
  repoUrl: string;
  sha: string;
} | null {
  const repoUrl = payload.repository?.html_url ?? "";

  // workflow_run event (triggered by GitHub Actions workflow)
  if (payload.workflow_run && payload.action === "completed") {
    const run = payload.workflow_run;
    const conclusion =
      run.conclusion === "success"
        ? "success"
        : run.conclusion === "failure" ||
          run.conclusion === "cancelled" ||
          run.conclusion === "timed_out"
        ? "failure"
        : null;

    const prUrls = run.pull_requests.map(
      (pr) =>
        `${repoUrl}/pull/${pr.number}`
    );

    return {
      conclusion,
      prUrls,
      repoUrl,
      sha: run.head_sha,
    };
  }

  // check_run event (older GitHub Actions integration)
  if (payload.check_run && payload.action === "completed") {
    const run = payload.check_run;
    const conclusion =
      run.conclusion === "success"
        ? "success"
        : run.conclusion !== "success" && run.conclusion !== null
        ? "failure"
        : null;

    return {
      conclusion,
      prUrls: [], // check_run doesn't include PR URLs directly
      repoUrl,
      sha: "",
    };
  }

  return null; // Not a CI completion event
}

// ── PR URL normalizer ─────────────────────────────────────────────────────

/**
 * Normalizes a PR URL to a consistent format for store lookups.
 * e.g. "https://api.github.com/repos/org/repo/pulls/42"
 *   → "https://github.com/org/repo/pull/42"
 */
export function normalizePRUrl(url: string): string {
  return url
    .replace("api.github.com/repos/", "github.com/")
    .replace("/pulls/", "/pull/");
}