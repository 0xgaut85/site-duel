import { NextResponse, type NextRequest } from "next/server";
import { authenticateProxyRequest } from "@/lib/proxy/auth";
import { anthropicError } from "@/lib/proxy/errors";
import { getClientIp } from "@/lib/proxy/http";
import { resolveModel } from "@/lib/proxy/models";
import {
  extractAnthropicUsage,
  forwardAnthropicMessages,
} from "@/lib/proxy/providers";
import { consumeQuota } from "@/lib/proxy/quota";
import { recordCall } from "@/lib/proxy/record-call";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const auth = await authenticateProxyRequest(req, "anthropic");
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return anthropicError("Invalid JSON body.", 400, "invalid_request_error");
  }

  if (body.stream === true) {
    return anthropicError(
      "Streaming is not supported yet. Call with stream: false or omit stream.",
      400,
      "invalid_request_error",
    );
  }

  const modelField = typeof body.model === "string" ? body.model : "duel-auto";
  const resolved = resolveModel(modelField, "anthropic");

  const quota = await consumeQuota(auth.ctx.subscriptionId, "anthropic");
  if (!quota.ok) return quota.response;

  const upstreamBody = {
    ...body,
    model: resolved.realModel,
  };

  try {
    const upstream = await forwardAnthropicMessages(upstreamBody);
    const usage = extractAnthropicUsage(upstream.body);
    const ok = upstream.status >= 200 && upstream.status < 300;

    await recordCall({
      accountId: auth.ctx.accountId,
      apiKeyId: auth.ctx.apiKeyId,
      displayModel: resolved.displayModel,
      realModel: resolved.realModel,
      provider: resolved.provider,
      wireProtocol: "anthropic",
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      latencyMs: Date.now() - started,
      ip,
      userAgent,
      error: ok ? null : `upstream ${upstream.status}`,
    });

    const responseBody =
      ok && upstream.body && typeof upstream.body === "object"
        ? {
            ...(upstream.body as Record<string, unknown>),
            model: resolved.displayModel,
          }
        : upstream.body;

    return NextResponse.json(responseBody, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upstream provider request failed.";

    await recordCall({
      accountId: auth.ctx.accountId,
      apiKeyId: auth.ctx.apiKeyId,
      displayModel: resolved.displayModel,
      realModel: resolved.realModel,
      provider: resolved.provider,
      wireProtocol: "anthropic",
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: Date.now() - started,
      ip,
      userAgent,
      error: message,
    });

    return anthropicError(message, 502, "api_error");
  }
}
