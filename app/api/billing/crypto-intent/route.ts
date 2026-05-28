import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isCryptoBillingConfigured } from "@/lib/billing/crypto/config";
import { createCryptoPaymentIntent } from "@/lib/billing/crypto/intents";

export const runtime = "nodejs";

const Body = z.object({
  tier: z.enum(["indie", "pro", "team"]),
  chain: z.enum(["base", "polygon"]),
});

export async function POST(req: Request) {
  if (!isCryptoBillingConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Crypto billing is not configured on this server." },
      { status: 503 },
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const intent = await createCryptoPaymentIntent({
      userId: session.user.id,
      email: session.user.email,
      tier: parsed.tier,
      chain: parsed.chain,
    });

    return NextResponse.json({ ok: true, ...intent });
  } catch (err) {
    console.error("[billing] create crypto intent failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not create payment intent." },
      { status: 500 },
    );
  }
}
