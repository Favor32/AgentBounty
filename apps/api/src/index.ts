import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { bountyRouter } from "./routes/bounty";
import { webhookRouter } from "./routes/webhook";
import { disputeRouter } from "./routes/dispute";
import { store } from "./db/store";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Raw body capture (required for GitHub webhook signature verification) ──
// Must be registered BEFORE express.json() on the webhook route.

app.use(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req: Request, _res: Response, next: NextFunction) => {
    (req as any).rawBody = req.body;
    // Re-parse as JSON for route handlers
    try {
      req.body = JSON.parse(req.body.toString());
    } catch {
      req.body = {};
    }
    next();
  }
);

// ── Standard middleware ───────────────────────────────────────────────────

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://agentbounty.vercel.app", // update with your deployment URL
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// JSON body parser for all non-webhook routes
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/webhook")) return next();
  express.json()(req, res, next);
});

// ── Health check ──────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "agentbounty-api",
    timestamp: new Date().toISOString(),
    bountyCount: store.getAll().length,
    env: {
      hasTrustlessWorkKey: !!process.env.TRUSTLESS_WORK_API_KEY,
      hasGroqKey:           !!process.env.GROQ_API_KEY,
      hasWebhookSecret: !!process.env.GITHUB_WEBHOOK_SECRET,
      hasAgentWallet: !!process.env.AGENT_WALLET_ADDRESS,
    },
  });
});

// ── Routes ────────────────────────────────────────────────────────────────

app.use("/bounties", bountyRouter);
app.use("/webhook", webhookRouter);
app.use("/dispute", disputeRouter);

// ── Agent SSE stream (real-time Atlas reasoning for the demo UI) ──────────
// GET /agent/stream?repo=https://github.com/...
// Returns a text/event-stream of Atlas's reasoning tokens.

app.get("/agent/stream", async (req: Request, res: Response) => {
  const repoUrl = req.query.repo as string;

  if (!repoUrl) {
    res.status(400).json({ error: "repo query param required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { streamAgentReasoning } = await import("./services/agent");
    for await (const chunk of streamAgentReasoning(repoUrl)) {
      res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stream error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  } finally {
    res.end();
  }
});

// ── Global error handler ──────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] Unhandled error:", err.message);
  res.status(500).json({ success: false, error: err.message });
});

// ── Start server ──────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 AgentBounty API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Bounties: http://localhost:${PORT}/bounties\n`);

  // Seed demo data for judges
  store.seed();
});

export default app;