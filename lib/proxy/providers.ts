import type { ProviderName } from "@/lib/proxy/models";

function requireProviderKey(provider: ProviderName): string {
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
    return key;
  }
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return key;
}

export async function forwardOpenAiChatCompletion(body: Record<string, unknown>) {
  const apiKey = requireProviderKey("openai");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { error: { message: text || "Upstream error" } };
  }

  return { status: res.status, body: parsed };
}

export async function forwardAnthropicMessages(body: Record<string, unknown>) {
  const apiKey = requireProviderKey("anthropic");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { type: "error", error: { message: text || "Upstream error" } };
  }

  return { status: res.status, body: parsed };
}

export function extractOpenAiUsage(body: unknown): { tokensIn: number; tokensOut: number } {
  if (!body || typeof body !== "object") return { tokensIn: 0, tokensOut: 0 };
  const usage = (body as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
  return {
    tokensIn: usage?.prompt_tokens ?? 0,
    tokensOut: usage?.completion_tokens ?? 0,
  };
}

export function extractAnthropicUsage(body: unknown): { tokensIn: number; tokensOut: number } {
  if (!body || typeof body !== "object") return { tokensIn: 0, tokensOut: 0 };
  const usage = (body as {
    usage?: { input_tokens?: number; output_tokens?: number };
  }).usage;
  return {
    tokensIn: usage?.input_tokens ?? 0,
    tokensOut: usage?.output_tokens ?? 0,
  };
}
