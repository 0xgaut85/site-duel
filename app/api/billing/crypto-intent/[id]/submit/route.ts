import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db/client";
import { submitCryptoPaymentTx } from "@/lib/billing/crypto/intents";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const Body = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export async function POST(req: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid transaction hash." },
      { status: 400 },
    );
  }

  const [account] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, session.user.id))
    .limit(1);

  if (!account) {
    return NextResponse.json({ ok: false, message: "No account found." }, { status: 404 });
  }

  try {
    const status = await submitCryptoPaymentTx({
      intentId: id,
      txHash: parsed.txHash,
      accountId: account.id,
      userEmail: session.user.email,
    });

    if (!status) {
      return NextResponse.json({ ok: false, message: "Intent not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    console.error("[billing] submit crypto tx failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not verify payment." },
      { status: 500 },
    );
  }
}
