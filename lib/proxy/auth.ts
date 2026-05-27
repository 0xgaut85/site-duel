import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db/client";
import { hashApiKey } from "@/lib/api-keys";
import { hasActivePaidSubscription } from "@/lib/billing/subscription-access";
import { anthropicError, openaiError } from "@/lib/proxy/errors";
import { extractApiKey, isValidKeyShape } from "@/lib/proxy/http";
import type { WireProtocol } from "@/lib/proxy/models";

export interface ProxyAuthContext {
  apiKeyId: string;
  accountId: string;
  subscriptionId: string;
}

type AuthFailure = {
  ok: false;
  response: ReturnType<typeof openaiError>;
};

type AuthSuccess = {
  ok: true;
  ctx: ProxyAuthContext;
};

export type AuthResult = AuthFailure | AuthSuccess;

function fail(message: string, status: number, protocol: WireProtocol): AuthFailure {
  return {
    ok: false,
    response:
      protocol === "anthropic"
        ? anthropicError(message, status)
        : openaiError(message, status),
  };
}

export async function authenticateProxyRequest(
  req: NextRequest,
  protocol: WireProtocol = "openai",
): Promise<AuthResult> {
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    return fail("Missing API key. Pass Authorization: Bearer duel_…", 401, protocol);
  }

  if (!isValidKeyShape(rawKey)) {
    return fail("Invalid Duel API key format.", 401, protocol);
  }

  const hash = hashApiKey(rawKey);

  const [row] = await db
    .select({
      id: schema.duelApiKeys.id,
      accountId: schema.duelApiKeys.accountId,
      revokedAt: schema.duelApiKeys.revokedAt,
    })
    .from(schema.duelApiKeys)
    .where(and(eq(schema.duelApiKeys.hash, hash), isNull(schema.duelApiKeys.revokedAt)))
    .limit(1);

  if (!row) {
    return fail("Invalid or revoked API key.", 401, protocol);
  }

  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.accountId, row.accountId))
    .limit(1);

  if (!hasActivePaidSubscription(subscription)) {
    return fail(
      "Active subscription required. Subscribe at https://duelagents.com/dashboard/billing",
      403,
      protocol,
    );
  }

  await db
    .update(schema.duelApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.duelApiKeys.id, row.id));

  return {
    ok: true,
    ctx: {
      apiKeyId: row.id,
      accountId: row.accountId,
      subscriptionId: subscription!.id,
    },
  };
}
