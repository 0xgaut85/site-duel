/**
 * /dashboard/settings — API key management + integration snippets.
 *
 * The page lists the current account's keys (id prefix + nickname +
 * "last used"), exposes a form to mint a new one, and prints copyable
 * install commands for each supported client. New plaintext keys are
 * surfaced exactly once at generation time via a client component that
 * keeps the value out of any cache.
 */

import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db, schema } from "@/db/client";
import { ApiKeysSection } from "./ApiKeysSection";
import { IntegrationsSection } from "./IntegrationsSection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();

  const [account] = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, session.user.id))
    .limit(1);

  const keys = account
    ? await db
        .select({
          id: schema.duelApiKeys.id,
          prefix: schema.duelApiKeys.prefix,
          name: schema.duelApiKeys.name,
          lastUsedAt: schema.duelApiKeys.lastUsedAt,
          createdAt: schema.duelApiKeys.createdAt,
          revokedAt: schema.duelApiKeys.revokedAt,
        })
        .from(schema.duelApiKeys)
        .where(eq(schema.duelApiKeys.accountId, account.id))
        .orderBy(desc(schema.duelApiKeys.createdAt))
    : [];

  return (
    <>
      <header className="mb-12">
        <p
          className="font-mono text-ink-faint mb-3"
          style={{ fontSize: "11px", letterSpacing: "0.28em" }}
        >
          / SETTINGS
        </p>
        <h1
          className="font-display font-medium text-ink"
          style={{
            fontSize: "clamp(2rem, 3.4vw, 2.8rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
          }}
        >
          Keys & integrations.
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-16">
        <ApiKeysSection keys={keys} />
        <IntegrationsSection />
      </div>
    </>
  );
}
