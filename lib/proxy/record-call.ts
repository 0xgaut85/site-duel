import { nanoid } from "nanoid";
import { db, schema } from "@/db/client";
import type { ProviderName, WireProtocol } from "@/lib/proxy/models";

interface RecordCallInput {
  accountId: string;
  apiKeyId: string;
  displayModel: string;
  realModel: string;
  provider: ProviderName;
  wireProtocol: WireProtocol;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  ip: string;
  userAgent: string | null;
  error: string | null;
  streamed?: boolean;
}

export async function recordCall(input: RecordCallInput): Promise<void> {
  try {
    await db.insert(schema.calls).values({
      id: nanoid(),
      accountId: input.accountId,
      apiKeyId: input.apiKeyId,
      displayModel: input.displayModel,
      realModel: input.realModel,
      provider: input.provider,
      wireProtocol: input.wireProtocol,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      latencyMs: input.latencyMs,
      ip: input.ip,
      userAgent: input.userAgent,
      error: input.error,
      streamed: input.streamed ?? false,
    });
  } catch {
    // Analytics must not break the proxy path.
  }
}
