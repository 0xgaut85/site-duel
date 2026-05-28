import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db/client";
import { getCryptoIntentStatus } from "@/lib/billing/crypto/intents";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const [account] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, session.user.id))
    .limit(1);

  if (!account) {
    return NextResponse.json({ ok: false, message: "No account found." }, { status: 404 });
  }

  const status = await getCryptoIntentStatus({
    intentId: id,
    accountId: account.id,
    userEmail: session.user.email,
  });

  if (!status) {
    return NextResponse.json({ ok: false, message: "Intent not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...status });
}
