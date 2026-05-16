import Groq from "groq-sdk";
import { CreateBountyInput, AgentTaskContext } from "../types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model options (all free on Groq):
//   "llama-3.3-70b-versatile"  ← best quality, recommended
//   "llama-3.1-8b-instant"     ← fastest
//   "mixtral-8x7b-32768"       ← good reasoning
const MODEL = "llama-3.3-70b-versatile";

// ── System prompt for Atlas ───────────────────────────────────────────────

const ATLAS_SYSTEM = `You are Atlas, an AI software engineering agent.
Your job is to analyze a software repository's state and identify the most impactful coding task that needs a human developer to complete.

You output ONLY valid JSON — no markdown, no explanation outside the JSON.

Always respond with this exact schema:
{
  "title": "Short imperative task title (max 60 chars)",
  "description": "Detailed technical description of exactly what needs to be done. Include: specific files to modify, acceptance criteria, and edge cases to handle. (200-400 chars)",
  "agentReasoning": "First-person explanation of why Atlas identified this task. Start with 'Atlas detected...' (100-200 chars)",
  "rewardEth": "Reward amount as decimal string. 0.01-0.05 small, 0.05-0.15 medium, 0.15-0.3 large",
  "testCommand": "Exact shell command to run tests, e.g. 'npm test'",
  "deadlineHours": 48
}`;

// ── Generate bounty from repo context ─────────────────────────────────────

export async function generateBountyFromContext(
  context: AgentTaskContext
): Promise<CreateBountyInput> {
  const userMessage = `
Repository: ${context.repositoryUrl}

${context.recentCommits?.length ? `Recent commits:\n${context.recentCommits.slice(0, 5).join("\n")}` : ""}
${context.openIssues?.length ? `Open issues:\n${context.openIssues.slice(0, 5).join("\n")}` : ""}
${context.existingTests?.length ? `Existing test files:\n${context.existingTests.slice(0, 10).join("\n")}` : "No test files found."}

Analyze this repository and generate one high-priority bounty task. Focus on: missing tests, security gaps, performance issues, or critical bugs. Respond with JSON only.
  `.trim();

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.7,
    messages: [
      { role: "system", content: ATLAS_SYSTEM },
      { role: "user",   content: userMessage },
    ],
    response_format: { type: "json_object" }, // forces valid JSON output
  });

  const raw = response.choices[0]?.message?.content ?? "";

  let parsed: CreateBountyInput & { deadlineHours: number };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[agent] Failed to parse Groq JSON response: ${raw}`);
  }

  const required = ["title", "description", "agentReasoning", "rewardEth", "testCommand"];
  for (const field of required) {
    if (!parsed[field as keyof typeof parsed]) {
      throw new Error(`[agent] Missing field in response: ${field}`);
    }
  }

  return {
    title:         parsed.title,
    description:   parsed.description,
    agentReasoning: parsed.agentReasoning,
    rewardEth:     parsed.rewardEth,
    repositoryUrl: context.repositoryUrl,
    testCommand:   parsed.testCommand,
    deadlineHours: Number(parsed.deadlineHours ?? 48),
  };
}

// ── Demo bounty (no API call needed) ─────────────────────────────────────

export async function generateDemoBounty(
  repositoryUrl: string
): Promise<CreateBountyInput> {
  return generateBountyFromContext({
    repositoryUrl,
    recentCommits: [
      "feat: add user authentication endpoints",
      "fix: resolve CORS issue on /api/v1",
      "chore: update dependencies",
    ],
    openIssues: [
      "#12: No rate limiting on public endpoints",
      "#15: Missing input validation on /api/users",
      "#18: Auth middleware has no unit tests",
    ],
    existingTests: ["tests/utils.test.ts", "tests/db.test.ts"],
  });
}

// ── Stream agent reasoning (for live demo UI) ─────────────────────────────
// Groq streaming is very fast — tokens appear near-instantly

export async function* streamAgentReasoning(
  repositoryUrl: string
): AsyncGenerator<string> {
  const stream = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 512,
    temperature: 0.8,
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are Atlas, an AI software engineering agent. 
Explain in 3-4 sentences what you are analyzing in this repository and what kind of issue you are looking for. 
Be specific, technical, and write in first person. Do NOT output JSON — just natural language narration.`,
      },
      {
        role: "user",
        content: `Analyze this repository: ${repositoryUrl}. What are you scanning for?`,
      },
    ],
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (token) yield token;
  }
}