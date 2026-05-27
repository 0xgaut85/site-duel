import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { anthropicError, openaiError } from "@/lib/proxy/errors";
import type { WireProtocol } from "@/lib/proxy/models";

export async function consumeQuota(
  subscriptionId: string,
  protocol: WireProtocol,
): Promise<{ ok: true } | { ok: false; response: ReturnType<typeof openaiError> }> {
  const [updated] = await db
    .update(schema.subscriptions)
    .set({
      callsUsedThisPeriod: sql`${schema.subscriptions.callsUsedThisPeriod} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.subscriptions.id, subscriptionId),
        eq(schema.subscriptions.status, "active"),
        sql`${schema.subscriptions.currentPeriodEnd} > now()`,
        sql`${schema.subscriptions.callsUsedThisPeriod} < ${schema.subscriptions.monthlyCallQuota}`,
      ),
    )
    .returning({ id: schema.subscriptions.id });

  if (!updated) {
    const message = "Monthly call quota exceeded. Upgrade or wait for period reset.";
    return {
      ok: false,
      response:
        protocol === "anthropic"
          ? anthropicError(message, 429, "rate_limit_error")
          : openaiError(message, 429, "rate_limit_exceeded"),
    };
  }

  return { ok: true };
}
